// Fixture tests for lib/qcode-core.mjs — the shared rendering core epic 05's modes all import.
//
//   node --test lib/qcode-core.test.mjs

import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CONFIG_VERSION,
  templateToTargetPath,
  isFrameworkOwned,
  resolveManifest,
  substituteTokens,
  leftoverTokens,
  preserveCockpitLayers,
  isCustomized,
  mergePackageJson,
  renderPackageJson,
  validateConfigShape,
  renderProject,
} from './qcode-core.mjs';

// This test file lives in lib/, one level below the repo root.
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REAL_TEMPLATES = join(ROOT, '.claude/skills/qcode-project-scaffolder/assets/templates');

// ── Path mapping ─────────────────────────────────────────────────────────────────────────────────

describe('templateToTargetPath — the one rule set every mode agrees on', () => {
  it('maps githooks/x to .githooks/x', () => {
    assert.equal(templateToTargetPath('githooks/pre-commit'), '.githooks/pre-commit');
  });
  it('maps ci/board-guard.yml to the fixed GitHub Actions path', () => {
    assert.equal(templateToTargetPath('ci/board-guard.yml'), '.github/workflows/board-guard.yml');
  });
  it('maps skills/x/SKILL.md to .claude/skills/x/SKILL.md', () => {
    assert.equal(templateToTargetPath('skills/product-check/SKILL.md'), '.claude/skills/product-check/SKILL.md');
  });
  it('maps the three bare dotfile templates', () => {
    assert.equal(templateToTargetPath('gitignore'), '.gitignore');
    assert.equal(templateToTargetPath('gitattributes'), '.gitattributes');
    assert.equal(templateToTargetPath('env.example'), '.env.example');
  });
  it('maps everything else 1:1', () => {
    assert.equal(templateToTargetPath('backlog/00-roadmap.md'), 'backlog/00-roadmap.md');
    assert.equal(templateToTargetPath('product/decisions.md'), 'product/decisions.md');
    assert.equal(templateToTargetPath('CLAUDE.md'), 'CLAUDE.md');
  });
  it('normalizes a backslash-separated path the same way (Windows readdir)', () => {
    assert.equal(templateToTargetPath('skills\\tech-qa\\SKILL.md'), '.claude/skills/tech-qa/SKILL.md');
  });
});

describe('isFrameworkOwned — the sync/migrate write boundary', () => {
  it('treats skills, githooks, ci, scripts, cockpit as framework-owned', () => {
    for (const p of ['skills/tech-planning/SKILL.md', 'githooks/status-guard.sh', 'ci/board-guard.yml', 'scripts/board-check.mjs', 'cockpit/generate.mjs', 'gitattributes']) {
      assert.equal(isFrameworkOwned(p), true, p);
    }
  });
  it('treats the board, backlog, architecture, product, and README as project-owned', () => {
    for (const p of ['PROJECT-STATUS.md', 'backlog/00-roadmap.md', 'architecture/00-overview.md', 'product/decisions.md', 'README.md', 'package.json', 'gitignore', 'CLAUDE.md']) {
      assert.equal(isFrameworkOwned(p), false, p);
    }
  });
});

// ── Token substitution — the whole-line-empty-token rule is the load-bearing case ─────────────────

describe('substituteTokens', () => {
  it('substitutes an inline token, leaving the rest of the line intact', () => {
    const out = substituteTokens('# {{PROJECT_NAME}}\n\n{{ONE_LINER}}', { PROJECT_NAME: 'Acme', ONE_LINER: 'Does things.' });
    assert.equal(out, '# Acme\n\nDoes things.');
  });

  it('DROPS the whole line when a whole-line token resolves to empty (the C7/02.2 fix)', () => {
    const input = [
      '| 01 | Foundation | `planned` | [epic-01](x) |',
      '{{EPIC_TABLE}}',
      '| 08 | Ad-hoc & improvements | `planned` | [08-adhoc](y) |',
    ].join('\n');
    const out = substituteTokens(input, { EPIC_TABLE: '' });
    assert.equal(
      out,
      '| 01 | Foundation | `planned` | [epic-01](x) |\n| 08 | Ad-hoc & improvements | `planned` | [08-adhoc](y) |'
    );
    assert.ok(!out.includes('\n\n'), 'must not leave a blank line where the token was');
  });

  it('substitutes a whole-line token with a MULTI-LINE value as real extra rows, not one squashed line', () => {
    const input = ['| 01 | Foundation |', '{{EPIC_TABLE}}', '| 08 | Ad-hoc |'].join('\n');
    const out = substituteTokens(input, { EPIC_TABLE: '| 02 | Second |\n| 03 | Third |' });
    assert.equal(out, '| 01 | Foundation |\n| 02 | Second |\n| 03 | Third |\n| 08 | Ad-hoc |');
  });

  it('leaves a token with NO value in the map verbatim, on both the whole-line and inline paths', () => {
    const wholeLine = substituteTokens('{{UNKNOWN}}', {});
    const inline = substituteTokens('x {{UNKNOWN}} y', {});
    assert.equal(wholeLine, '{{UNKNOWN}}');
    assert.equal(inline, 'x {{UNKNOWN}} y');
  });

  it('does not drop a whole-line token whose value is a non-empty string that merely LOOKS falsy', () => {
    const out = substituteTokens('{{COUNT}}', { COUNT: '0' });
    assert.equal(out, '0'); // '0' is a real, non-empty answer — must render, not be treated as "empty"
  });
});

describe('leftoverTokens', () => {
  it('finds tokens still unresolved AFTER a real substitution pass (not scanned from raw source)', () => {
    const substituted = substituteTokens('# {{PROJECT_NAME}} — {{MISSING}}', { PROJECT_NAME: 'Acme' });
    assert.equal(substituted, '# Acme — {{MISSING}}'); // PROJECT_NAME resolves; MISSING has no entry
    assert.deepEqual(leftoverTokens(substituted), ['{{MISSING}}']);
  });
  it('is empty once everything resolved', () => {
    assert.deepEqual(leftoverTokens('# Acme'), []);
  });
});

// ── package.json — the add-missing-only merge ───────────────────────────────────────────────────

describe('mergePackageJson', () => {
  it('adds a missing script key without touching an existing one with the same name', () => {
    const existing = { name: 'x', scripts: { test: 'my-custom-test-runner' } };
    const template = { name: 'x', scripts: { test: 'vitest', 'board:check': 'node scripts/board-check.mjs' } };
    const merged = mergePackageJson(existing, template);
    assert.equal(merged.scripts.test, 'my-custom-test-runner', 'existing value must survive untouched');
    assert.equal(merged.scripts['board:check'], 'node scripts/board-check.mjs', 'missing key must be added');
  });

  it('never overwrites a non-object top-level key the project already set', () => {
    const existing = { name: 'my-actual-project-name' };
    const template = { name: 'template-default-name' };
    assert.equal(mergePackageJson(existing, template).name, 'my-actual-project-name');
  });

  it('adds a whole missing top-level key wholesale', () => {
    const merged = mergePackageJson({ name: 'x' }, { name: 'x', private: true });
    assert.equal(merged.private, true);
  });
});

describe('renderPackageJson — integration against real temp directories', () => {
  const withTempProject = (fn) => {
    const dir = mkdtempSync(join(tmpdir(), 'qcode-pkg-'));
    try {
      return fn(dir);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };
  const templatesDir = mkdtempSync(join(tmpdir(), 'qcode-pkg-templates-'));
  writeFileSync(
    join(templatesDir, 'package.json'),
    JSON.stringify({ name: '{{PROJECT_SLUG}}', scripts: { cockpit: 'node cockpit/generate.mjs', 'board:check': 'node scripts/board-check.mjs' } })
  );
  after(() => rmSync(templatesDir, { recursive: true, force: true }));

  it('creates package.json directly when the project has none yet', () => {
    withTempProject((dir) => {
      const result = renderPackageJson({ templatesRoot: templatesDir, projectRoot: dir, tokens: { PROJECT_SLUG: 'acme' }, write: true });
      assert.equal(result.action, 'created');
      const written = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
      assert.equal(written.name, 'acme');
    });
  });

  it('merges (add-missing-only) when the project already has one, reporting only the new keys', () => {
    withTempProject((dir) => {
      writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'acme', scripts: { cockpit: 'custom-cockpit-cmd' } }));
      const result = renderPackageJson({ templatesRoot: templatesDir, projectRoot: dir, tokens: { PROJECT_SLUG: 'acme' }, write: true });
      assert.equal(result.action, 'merged');
      assert.deepEqual(result.addedKeys, ['board:check']);
      const written = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
      assert.equal(written.scripts.cockpit, 'custom-cockpit-cmd', 'existing script must survive');
      assert.equal(written.scripts['board:check'], 'node scripts/board-check.mjs', 'missing script must be added');
      assert.ok(existsSync(join(dir, 'package.json.qcode-bak')), 'must back up before overwriting');
    });
  });

  it('reports upToDate and does not write when nothing would change', () => {
    withTempProject((dir) => {
      writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'acme', scripts: { cockpit: 'node cockpit/generate.mjs', 'board:check': 'node scripts/board-check.mjs' } }));
      const before = readFileSync(join(dir, 'package.json'), 'utf8');
      const result = renderPackageJson({ templatesRoot: templatesDir, projectRoot: dir, tokens: { PROJECT_SLUG: 'acme' }, write: true });
      assert.equal(result.action, 'upToDate');
      assert.equal(readFileSync(join(dir, 'package.json'), 'utf8'), before);
    });
  });
});

// ── Cockpit LAYERS preservation ─────────────────────────────────────────────────────────────────

describe('preserveCockpitLayers', () => {
  it('keeps a project-customized LAYERS block across a re-render', () => {
    const rendered = 'const LAYERS = null;\nrest of file';
    const current = 'const LAYERS = [{ key: "a" }];\nold rest';
    assert.equal(preserveCockpitLayers(rendered, current), 'const LAYERS = [{ key: "a" }];\nrest of file');
  });
  it('does not fight itself when the current file also has the default null', () => {
    const rendered = 'const LAYERS = null;\nrest';
    const current = 'const LAYERS = null;\nold rest';
    assert.equal(preserveCockpitLayers(rendered, current), rendered);
  });
});

// ── customized[] protection ─────────────────────────────────────────────────────────────────────

describe('isCustomized', () => {
  it('matches by substring against config.customized, per the existing Finosonido-adoption convention', () => {
    assert.equal(isCustomized('.claude/skills/tech-planning/SKILL.md', { customized: ['tech-planning'] }), true);
    assert.equal(isCustomized('.claude/skills/tech-build/SKILL.md', { customized: ['tech-planning'] }), false);
  });
  it('is false with no customized list at all', () => {
    assert.equal(isCustomized('anything', {}), false);
  });
});

// ── Config shape ─────────────────────────────────────────────────────────────────────────────────

describe('validateConfigShape', () => {
  it('accepts a well-formed config', () => {
    assert.deepEqual(
      validateConfigShape({ configVersion: CONFIG_VERSION, frameworkVersion: '2.0.0', scaffoldedAt: '2026-08-14', tokens: {} }),
      []
    );
  });
  it('reports every missing required key', () => {
    const problems = validateConfigShape({});
    assert.equal(problems.length, 4);
  });
  it('reports a wrong-typed tokens field', () => {
    const problems = validateConfigShape({ configVersion: 1, frameworkVersion: 'x', scaffoldedAt: 'x', tokens: [] });
    assert.ok(problems.some((p) => p.includes('tokens must be an object')));
  });
});

// ── renderProject — idempotency, against a small synthetic templates tree ─────────────────────────

describe('renderProject — idempotency and manifest filtering', () => {
  const templatesDir = mkdtempSync(join(tmpdir(), 'qcode-render-templates-'));
  mkdirSync(join(templatesDir, 'skills/tech-planning'), { recursive: true });
  writeFileSync(join(templatesDir, 'CLAUDE.md'), '# {{PROJECT_NAME}}\n\n{{DOMAIN_SUMMARY}}\n');
  writeFileSync(join(templatesDir, 'skills/tech-planning/SKILL.md'), '# Plan gate for {{PROJECT_NAME}}\n');
  writeFileSync(join(templatesDir, 'gitattributes'), '* text=auto\n');
  after(() => rmSync(templatesDir, { recursive: true, force: true }));

  const tokens = { PROJECT_NAME: 'Acme', DOMAIN_SUMMARY: 'A thing that does things.' };

  it('render → render again on the same project produces ZERO diff (byte-identical)', () => {
    const projectDir = mkdtempSync(join(tmpdir(), 'qcode-render-project-'));
    try {
      const first = renderProject({ templatesRoot: templatesDir, projectRoot: projectDir, tokens, write: true });
      assert.equal(first.created.length, 3);

      const second = renderProject({ templatesRoot: templatesDir, projectRoot: projectDir, tokens, write: true });
      assert.equal(second.created.length, 0);
      assert.equal(second.updated.length, 0);
      assert.equal(second.upToDate.length, 3, 'a second render of the same config must find everything already current');
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });

  it('filterOwner: "framework" renders only skills/githooks/ci/scripts/cockpit, never CLAUDE.md', () => {
    const projectDir = mkdtempSync(join(tmpdir(), 'qcode-render-sync-'));
    try {
      const report = renderProject({ templatesRoot: templatesDir, projectRoot: projectDir, tokens, write: true, filterOwner: 'framework' });
      assert.ok(!existsSync(join(projectDir, 'CLAUDE.md')), 'project-owned CLAUDE.md must not be touched by a framework-only render');
      assert.ok(existsSync(join(projectDir, '.claude/skills/tech-planning/SKILL.md')));
      assert.equal(report.created.length, 2); // tech-planning/SKILL.md + gitattributes
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });

  it('reports skippedMissingTokens rather than writing a half-rendered file', () => {
    const projectDir = mkdtempSync(join(tmpdir(), 'qcode-render-missing-'));
    try {
      const report = renderProject({ templatesRoot: templatesDir, projectRoot: projectDir, tokens: { PROJECT_NAME: 'Acme' }, write: true });
      assert.ok(report.skippedMissingTokens.some((e) => e.targetRelPath === 'CLAUDE.md'));
      assert.ok(!existsSync(join(projectDir, 'CLAUDE.md')), 'a file with a missing token must not be written at all');
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });
});

// ── resolveManifest against the REAL templates tree — every template must at least parse into
// a manifest entry with a sane target path; this is also the acceptance-criterion proof that the
// whole-line-empty-token fix works end to end, not just in a synthetic fixture. ────────────────────

// ── check-links.mjs's inline-code stripping — the double-backtick CommonMark escape. Found the
// same way: this file's OWN 05.1 closure prose used `` `` [`skill-name`](../path) `` `` to show a
// literal backtick-wrapped link inline, and registered as a dead link — stripping single-backtick
// spans first misparses a double-backtick delimiter's own opening pair as one empty single span. ──

describe('checkLinks — the double-backtick CommonMark code-span escape', () => {
  it('does not treat a double-backtick-delimited example (which may contain literal backticks) as a real link', async () => {
    const { checkLinks } = await import('../.claude/skills/qcode-project-scaffolder/assets/templates/scripts/check-links.mjs');
    const dir = mkdtempSync(join(tmpdir(), 'qcode-doublebacktick-'));
    try {
      writeFileSync(
        join(dir, 'doc.md'),
        'See the pattern `` [`skill-name`](../path) `` for how this works.\n'
      );
      const dead = checkLinks(dir, ['doc.md']);
      assert.deepEqual(dead, [], 'a double-backtick-escaped illustrative example must not register as a dead link');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('still catches a REAL dead link sitting right next to a double-backtick example on the same line', async () => {
    const { checkLinks } = await import('../.claude/skills/qcode-project-scaffolder/assets/templates/scripts/check-links.mjs');
    const dir = mkdtempSync(join(tmpdir(), 'qcode-doublebacktick-real-'));
    try {
      writeFileSync(
        join(dir, 'doc.md'),
        'The pattern `` [`x`](../y) `` is illustrative, but [this one](./genuinely-missing.md) is real.\n'
      );
      const dead = checkLinks(dir, ['doc.md']);
      assert.equal(dead.length, 1);
      assert.match(dead[0].target, /genuinely-missing\.md/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ── check-links.mjs's git-vs-walk fallback — found via 05.2's own generate self-test, not
// guessed at: a project with `git init` run but nothing staged yet has a REAL .git directory, and
// `git ls-files` silently returns empty for it (not an error) — trusting that at face value would
// make check-links report "all resolve" by checking ZERO files, a false pass worse than the
// missing-repo case because it fails quiet instead of loud. ────────────────────────────────────────

describe("check-links.mjs's trackedMarkdownFiles — the git-init-but-uncommitted case", () => {
  it('falls back to walking when git exists but has nothing staged/committed (not just when git is absent)', async () => {
    const { trackedMarkdownFiles } = await import('../.claude/skills/qcode-project-scaffolder/assets/templates/scripts/check-links.mjs');
    const dir = mkdtempSync(join(tmpdir(), 'qcode-git-uncommitted-'));
    try {
      writeFileSync(join(dir, 'README.md'), '# x\n');
      execFileSync('git', ['init', '-b', 'main'], { cwd: dir, stdio: 'pipe' }); // .git now exists, nothing staged
      const files = trackedMarkdownFiles(dir);
      assert.deepEqual(files, ['README.md'], 'must find README.md via the walk fallback, not report zero via a trusted-but-empty git ls-files');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('uses real git tracking once something is actually committed', async () => {
    const { trackedMarkdownFiles } = await import('../.claude/skills/qcode-project-scaffolder/assets/templates/scripts/check-links.mjs');
    const dir = mkdtempSync(join(tmpdir(), 'qcode-git-committed-'));
    try {
      writeFileSync(join(dir, 'tracked.md'), '# tracked\n');
      writeFileSync(join(dir, 'untracked.md'), '# untracked\n');
      execFileSync('git', ['init', '-b', 'main'], { cwd: dir, stdio: 'pipe' });
      execFileSync('git', ['add', 'tracked.md'], { cwd: dir, stdio: 'pipe' });
      execFileSync('git', ['-c', 'user.email=t@t.com', '-c', 'user.name=t', 'commit', '-m', 'x'], { cwd: dir, stdio: 'pipe' });
      const files = trackedMarkdownFiles(dir);
      assert.deepEqual(files, ['tracked.md'], 'once git has real history, only TRACKED files count -- the untracked one must not appear');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ── check-links.mjs's embedded-template-source exclusion — found running the real, newly-
// installed check-links.mjs against QCode-Method's OWN repo root for the first time (05.4): every
// relative link inside .claude/skills/qcode-project-scaffolder/assets/templates/ is calibrated for
// a file's RENDERED position in a scaffolded project, not its current position inside the template
// tree, so scanning it from here always reports dozens of correctly-dead-looking links. Mompa's own
// check-links.mjs already excludes its embedded scaffolder templates for the same reason. ─────────

describe("check-links.mjs's embedded-template-source exclusion", () => {
  it('excludes a path under any assets/templates/ directory from the git-tracked file list', async () => {
    const { trackedMarkdownFiles } = await import('../.claude/skills/qcode-project-scaffolder/assets/templates/scripts/check-links.mjs');
    const dir = mkdtempSync(join(tmpdir(), 'qcode-embedded-templates-'));
    try {
      writeFileSync(join(dir, 'PROJECT-STATUS.md'), '# real board\n');
      mkdirSync(join(dir, '.claude/skills/scaffolder/assets/templates'), { recursive: true });
      writeFileSync(join(dir, '.claude/skills/scaffolder/assets/templates/CLAUDE.md'), '# template source\n');
      execFileSync('git', ['init', '-b', 'main'], { cwd: dir, stdio: 'pipe' });
      execFileSync('git', ['add', '-A'], { cwd: dir, stdio: 'pipe' });
      execFileSync('git', ['-c', 'user.email=t@t.com', '-c', 'user.name=t', 'commit', '-m', 'x'], { cwd: dir, stdio: 'pipe' });
      const files = trackedMarkdownFiles(dir);
      assert.deepEqual(files, ['PROJECT-STATUS.md'], 'the embedded template file must be excluded, the real board file must not');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('a project with no embedded template tree is completely unaffected (negative case)', async () => {
    const { trackedMarkdownFiles } = await import('../.claude/skills/qcode-project-scaffolder/assets/templates/scripts/check-links.mjs');
    const dir = mkdtempSync(join(tmpdir(), 'qcode-no-embedded-templates-'));
    try {
      writeFileSync(join(dir, 'a.md'), '# a\n');
      writeFileSync(join(dir, 'b.md'), '# b\n');
      execFileSync('git', ['init', '-b', 'main'], { cwd: dir, stdio: 'pipe' });
      execFileSync('git', ['add', '-A'], { cwd: dir, stdio: 'pipe' });
      execFileSync('git', ['-c', 'user.email=t@t.com', '-c', 'user.name=t', 'commit', '-m', 'x'], { cwd: dir, stdio: 'pipe' });
      const files = trackedMarkdownFiles(dir).sort();
      assert.deepEqual(files, ['a.md', 'b.md']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('resolveManifest + renderProject against the real assets/templates/ tree', () => {
  it('produces a manifest with no duplicate target paths', () => {
    const manifest = resolveManifest(REAL_TEMPLATES, {});
    const targets = manifest.map((e) => e.targetRelPath);
    assert.equal(new Set(targets).size, targets.length, 'two templates must never map to the same target path');
  });

  it('excludes package.json from the manifest (it gets a structural merge, not a text render)', () => {
    const manifest = resolveManifest(REAL_TEMPLATES, {});
    assert.ok(!manifest.some((e) => e.templateRelPath === 'package.json'));
  });

  it('includes business-context.md so a fresh generate creates it, but marks it project-owned so sync never touches it', () => {
    const manifest = resolveManifest(REAL_TEMPLATES, {});
    const entry = manifest.find((e) => e.templateRelPath === 'skills/compass-check/business-context.md');
    assert.ok(entry, 'business-context.md must be in the manifest -- generate has nothing to protect yet');
    assert.equal(entry.owner, 'project', 'must be project-owned so a sync (filterOwner: framework) skips it, matching qcode-sync\'s original promise never to touch it');
  });

  it('excludes compass-check entirely when compassCheck: false', () => {
    const manifest = resolveManifest(REAL_TEMPLATES, { compassCheck: false });
    assert.ok(!manifest.some((e) => e.templateRelPath.startsWith('skills/compass-check/')));
  });

  it(
    'ACCEPTANCE CRITERION: rendering a Foundation-only project (EPIC_TABLE -> "") and running the ' +
      'real board-check.mjs against the result finds the board TRUE — proving the whole-line-empty-' +
      'token fix works end to end, not just against a synthetic string',
    () => {
      const projectDir = mkdtempSync(join(tmpdir(), 'qcode-foundation-only-'));
      try {
        const tokens = {
          PROJECT_NAME: 'Acme',
          PROJECT_SLUG: 'acme',
          ONE_LINER: 'A thing that does things.',
          DOMAIN_SUMMARY: 'It does the things a project like this does.',
          TEAM_CONTEXT: 'solo developer',
          OWNER_NAME: 'the owner',
          PRODUCT_CONSUMERS: 'n/a',
          CLAUDE_PLAN: 'Pro',
          VALUE_ARCHETYPES: 'replace/avoid a cost',
          DECISION_AXES: 'Confidence · Time-to-market · Reliability · ROI',
          STACK_HOSTING: 'none',
          STACK_FRONTEND: 'none',
          STACK_BACKEND: 'none',
          STACK_DATA: 'none',
          STACK_AI: 'none',
          TENANCY: 'single-tenant',
          TYPED_RESULT_NAME: 'Result<T>',
          ACCESS_LAYER: 'n/a',
          HOUSE_STANDARDS: 'strict types',
          ARCHITECTURE_OVERVIEW: 'a simple layered app',
          EPIC_TABLE: '', // the Foundation-only default — the exact case that used to leave a blank line
          EPIC_TABLE_ROADMAP: '',
          TODAY: '2026-08-14',
          FRAMEWORK_VERSION: '2.0.0',
        };
        const config = { compassCheck: false, tokens };

        const report = renderProject({ templatesRoot: REAL_TEMPLATES, projectRoot: projectDir, tokens, config, write: true });
        assert.equal(report.skippedMissingTokens.length, 0, JSON.stringify(report.skippedMissingTokens.map((e) => e.targetRelPath)));

        const pkg = renderPackageJson({ templatesRoot: REAL_TEMPLATES, projectRoot: projectDir, tokens, write: true });
        assert.ok(['created', 'merged'].includes(pkg.action));

        // skills-lock.json doesn't exist as a template yet -- it ships in a later story (06.2) --
        // so tech-planning's link to it (a deliberate, already-tracked forward reference; see that
        // story's closure notes) is the one dead link a render of TODAY's templates will always
        // have. Stub it here to simulate "as if 06.2 had already landed", so this test proves
        // board-check genuinely exits 0 rather than special-casing one known, expected failure.
        writeFileSync(join(projectDir, 'skills-lock.json'), '{ "version": 1, "skills": {} }\n');

        // Direct proof the whole-line-empty-token fix fired: the Epics table has no blank line
        // where {{EPIC_TABLE}} used to sit — epic 01's row must be immediately followed by epic
        // 08's, with nothing (not even an empty line) between them.
        const epicsTable = readFileSync(join(projectDir, 'PROJECT-STATUS.md'), 'utf8')
          .split('\n')
          .filter((l) => l.startsWith('| 01') || l.startsWith('| 08') || l.trim() === '');
        const foundationIdx = epicsTable.findIndex((l) => l.startsWith('| 01'));
        assert.equal(
          epicsTable[foundationIdx + 1]?.startsWith('| 08'),
          true,
          `expected epic 08's row immediately after epic 01's, got: ${JSON.stringify(epicsTable)}`
        );

        execFileSync('node', [join(projectDir, 'scripts/board-check.mjs')], { cwd: projectDir, stdio: 'pipe' });
        // execFileSync throws on a non-zero exit -- reaching this line IS the proof: board-check
        // ran against a real, freshly-rendered Foundation-only project and exited 0.
        assert.ok(true, 'board-check.mjs exited 0 against the rendered Foundation-only project');
      } finally {
        rmSync(projectDir, { recursive: true, force: true });
      }
    }
  );
});
