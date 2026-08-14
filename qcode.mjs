#!/usr/bin/env node
// qcode.mjs — the QCode-Method CLI.
//
// Four modes, one renderer: `generate` (05.2), `sync`/`migrate`/`check` (05.4). `scripts/qcode-sync.mjs`
// is superseded by `sync` below — same behavior, now built on the shared lib/qcode-core.mjs engine
// instead of its own hand-maintained MANAGED file list (see that script's own header for the retirement
// note).
//
//   node qcode.mjs generate <target-dir> [options]
//
// Options:
//   --name <name>       {{PROJECT_NAME}}
//   --slug <slug>       {{PROJECT_SLUG}} (kebab-case; derived from --name if omitted)
//   --owner <name>      {{OWNER_NAME}} (default: "the owner")
//   --remote <git-url>  a git remote to add as "origin" (optional)
//   --git / --no-git    initialize git + install the status-guard hook (default: yes)
//   --compass-check / --no-compass-check   install the optional compass-check skill (default: yes)
//   --config <path>     read every answer from a JSON file instead of flags (see below)
//   --yes                accept defaults for anything not given; never prompt (for scripted/AI use)
//
// Without --yes, any required answer that's still missing after flags/config is applied is prompted
// for interactively. This mode asks ONLY the five static-identity facts above (plus the git/
// compass-check toggles) — never a judgment question (value model, stack, architecture, roadmap).
// Those are `qcode-charter`'s job, next: every token this mode can't answer is written as an
// explicit `(to define: ... — resolve during the charter pass)` gap, in the same convention the
// templates already use for architecture-specific gaps, so the scaffold is structurally complete
// but honestly incomplete rather than silently wrong.
//
// --config file shape: { "name": "...", "slug": "...", "owner": "...", "remote": "...",
//                         "git": true, "compassCheck": true }
//
// Zero dependencies beyond Node itself and `git` on PATH (for the optional --git step).

import { readFileSync, writeFileSync, existsSync, mkdirSync, chmodSync, readdirSync, statSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, relative, basename } from 'node:path';
import { createInterface } from 'node:readline/promises';

import { renderProject, renderPackageJson, resolveManifest, loadConfig, CONFIG_VERSION } from './lib/qcode-core.mjs';
import {
  parseV1Epic,
  parseEpicFilename,
  renderStoryFile,
  renderEpicReadme,
  renderClosedRow,
  compareStoryIds,
  parseEpicsTable,
  parseRecentlyDone,
} from './lib/qcode-migrate.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)));
const TEMPLATES = join(ROOT, '.claude/skills/qcode-project-scaffolder/assets/templates');

const die = (m) => { console.error(`\n❌ qcode: ${m}\n`); process.exit(1); };

// ── Every token `generate` can and cannot answer. ───────────────────────────────────────────────
//
// The five static-identity tokens are asked (flag, config, or prompt). Everything else is a
// judgment call `qcode-charter` (05.3) makes — filled here with a `(to define: ...)` gap in the
// house convention, never a silent guess.
const CHARTER_GAP = (what) => `(to define: ${what} — resolve during the \`qcode-charter\` pass.)`;

const CHARTER_DEFERRED_TOKENS = {
  ONE_LINER: CHARTER_GAP('a one-sentence description of what this project is'),
  DOMAIN_SUMMARY: CHARTER_GAP('a short paragraph — what it does, for whom'),
  VALUE_ARCHETYPES: CHARTER_GAP('the 1–3 ways this project creates value'),
  DECISION_AXES: 'Confidence · Time-to-market · Reliability · ROI', // a sensible default, not a gap
  STACK_HOSTING: CHARTER_GAP('hosting/serverless platform, or "none"'),
  STACK_FRONTEND: CHARTER_GAP('frontend stack, or "none"'),
  STACK_BACKEND: CHARTER_GAP('backend stack, or "none"'),
  STACK_DATA: CHARTER_GAP('data store, or "none"'),
  STACK_AI: CHARTER_GAP('AI stack, or "none"'),
  TENANCY: 'single-tenant', // a sensible default; charter changes it if the project is multi-tenant
  TYPED_RESULT_NAME: 'Result<T>',
  ACCESS_LAYER: CHARTER_GAP('a typed data-access package name, or "n/a"'),
  HOUSE_STANDARDS: CHARTER_GAP('the engineering non-negotiables'),
  ARCHITECTURE_OVERVIEW: CHARTER_GAP('the layers + the seams that hold them apart'),
  PRODUCT_CONSUMERS: CHARTER_GAP('who reads/acts on this project\'s product surfaces, or "n/a"'),
  CLAUDE_PLAN: 'Pro', // a sensible default; charter tightens the token-discipline defaults if wrong
  TEAM_CONTEXT: 'solo developer',
  EPIC_TABLE: '', // Foundation-only default — whole-line-empty-token rule removes this line entirely
  EPIC_TABLE_ROADMAP: '',
};

// ── Argument parsing. ────────────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--git') args.git = true;
    else if (a === '--no-git') args.git = false;
    else if (a === '--compass-check') args.compassCheck = true;
    else if (a === '--no-compass-check') args.compassCheck = false;
    else if (a === '--yes') args.yes = true;
    else if (a === '--write') args.write = true;
    else if (a === '--force') args.force = true;
    else if (a.startsWith('--')) {
      const key = a.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      args[key] = argv[++i];
    } else {
      args._.push(a);
    }
  }
  return args;
}

const slugify = (name) =>
  name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// A human-readable host name derived from the --remote URL already asked for as a static-identity
// fact — never a separate question. Recognizes the common hosts by their well-known domain; falls
// back to the bare domain for anything else, and to an honest gap when there's no remote yet.
const KNOWN_HOSTS = { 'github.com': 'GitHub', 'gitlab.com': 'GitLab', 'bitbucket.org': 'Bitbucket' };
function deriveRepoHost(remote) {
  if (!remote) return CHARTER_GAP('which git host this repo will live on');
  const m = remote.match(/(?:@|\/\/)([^/:]+)[:/]/) || remote.match(/(?:@|\/\/)([^/:]+)$/);
  const domain = m ? m[1] : null;
  return (domain && KNOWN_HOSTS[domain]) || domain || CHARTER_GAP('which git host this repo will live on');
}

// ── Gathering the five static-identity answers — flags/config first, then an interactive prompt
// for whatever's still missing (unless --yes). ──────────────────────────────────────────────────

async function gatherAnswers(args) {
  const fromConfig = args.config ? JSON.parse(readFileSync(resolve(args.config), 'utf8')) : {};
  const answers = {
    name: args.name ?? fromConfig.name,
    slug: args.slug ?? fromConfig.slug,
    owner: args.owner ?? fromConfig.owner,
    remote: args.remote ?? fromConfig.remote,
    git: args.git ?? fromConfig.git,
    compassCheck: args.compassCheck ?? fromConfig.compassCheck,
  };

  const needsPrompt = answers.name === undefined || answers.owner === undefined || answers.git === undefined;
  if (needsPrompt && !args.yes && process.stdin.isTTY) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    try {
      if (!answers.name) answers.name = await rl.question('Project name: ');
      if (!answers.name) die('a project name is required');
      if (!answers.slug) {
        const suggested = slugify(answers.name);
        const reply = await rl.question(`Project slug [${suggested}]: `);
        answers.slug = reply.trim() || suggested;
      }
      if (!answers.owner) {
        const reply = await rl.question('Owner name [the owner]: ');
        answers.owner = reply.trim() || 'the owner';
      }
      if (answers.remote === undefined) {
        const reply = await rl.question('Git remote URL (optional, press enter to skip): ');
        answers.remote = reply.trim() || undefined;
      }
      if (answers.git === undefined) {
        const reply = await rl.question('Initialize git + install the status-guard hook now? [Y/n]: ');
        answers.git = reply.trim().toLowerCase() !== 'n';
      }
      if (answers.compassCheck === undefined) {
        const reply = await rl.question('Install the optional compass-check strategic advisor? [Y/n]: ');
        answers.compassCheck = reply.trim().toLowerCase() !== 'n';
      }
    } finally {
      rl.close();
    }
  }

  // Defaults for anything still unanswered (non-interactive/--yes path).
  answers.slug ??= answers.name ? slugify(answers.name) : undefined;
  answers.owner ??= 'the owner';
  answers.git ??= true;
  answers.compassCheck ??= true;

  if (!answers.name) die('--name (or an interactive prompt on a TTY) is required');
  if (!answers.slug) die('--slug (or a derivable --name) is required');

  return answers;
}

// ── Self-test (the C7 fix): a scaffold must prove itself structurally sound before this mode
// reports success. Failures here are a rendering BUG, not a gap for the charter pass to fill — so
// this fails loudly and non-zero rather than quietly leaving a broken scaffold that looks done. ───

function selfTest(projectDir) {
  const problems = [];

  try {
    execFileSync('node', [join(projectDir, 'scripts/board-check.mjs')], { cwd: projectDir, stdio: 'pipe' });
  } catch (e) {
    problems.push(`board:check failed:\n${(e.stdout || e.message).toString()}`);
  }
  // check:links is covered by board:check's own rule 5 (it shells out to check-links.mjs), so
  // running it again separately here would just re-check the same thing a second time.

  try {
    execFileSync('node', [join(projectDir, 'cockpit/generate.mjs')], { cwd: projectDir, stdio: 'pipe' });
  } catch (e) {
    problems.push(`cockpit failed to render:\n${(e.stdout || e.message).toString()}`);
  }

  return problems;
}

/** Every `(to define...)` gap left in the rendered tree, counted (not enumerated — that's a lot of
 * files); used only for the hand-off report. Cheap: greps the same files the manifest already
 * named, not a fresh filesystem walk. */
function countDefineGaps(projectDir, manifest) {
  let count = 0;
  for (const entry of manifest) {
    const abs = join(projectDir, entry.targetRelPath);
    if (!existsSync(abs)) continue;
    const content = readFileSync(abs, 'utf8');
    const matches = content.match(/\(to define:/g);
    if (matches) count += matches.length;
  }
  return count;
}

// ── generate ─────────────────────────────────────────────────────────────────────────────────────

async function generate(args) {
  const targetArg = args._[0];
  if (!targetArg) die('usage: node qcode.mjs generate <target-dir> [options]');
  const projectDir = resolve(targetArg);

  const answers = await gatherAnswers(args);

  console.log(`\nQCode-Method generate`);
  console.log(`  project name  : ${answers.name}`);
  console.log(`  project slug  : ${answers.slug}`);
  console.log(`  owner         : ${answers.owner}`);
  console.log(`  git remote    : ${answers.remote ?? '(none)'}`);
  console.log(`  init git      : ${answers.git ? 'yes' : 'no'}`);
  console.log(`  compass-check : ${answers.compassCheck ? 'yes' : 'no'}`);
  console.log(`  target        : ${projectDir}\n`);

  const frameworkVersion = readFileSync(join(ROOT, 'VERSION'), 'utf8').trim();
  const today = new Date().toISOString().slice(0, 10);

  const tokens = {
    ...CHARTER_DEFERRED_TOKENS,
    PROJECT_NAME: answers.name,
    PROJECT_SLUG: answers.slug,
    OWNER_NAME: answers.owner,
    REPO_HOST: deriveRepoHost(answers.remote),
    TODAY: today,
    FRAMEWORK_VERSION: frameworkVersion,
  };
  // ACCESS_LAYER's default template value references {{PROJECT_SLUG}} (`@{{PROJECT_SLUG}}/data`);
  // since it's charter-deferred here, leave it a plain gap rather than half-substituting.

  const config = {
    configVersion: CONFIG_VERSION,
    frameworkVersion,
    scaffoldedAt: today,
    compassCheck: answers.compassCheck,
    tokens,
  };

  mkdirSync(projectDir, { recursive: true });

  const report = renderProject({ templatesRoot: TEMPLATES, projectRoot: projectDir, tokens, config, write: true });
  if (report.skippedMissingTokens.length) {
    die(
      `${report.skippedMissingTokens.length} file(s) have a {{TOKEN}} with no value at all (not even a ` +
        `charter-deferred default) — this is a qcode.mjs bug, not a user gap:\n` +
        report.skippedMissingTokens.map((e) => `  - ${e.targetRelPath}: ${e.leftover.join(', ')}`).join('\n')
    );
  }

  renderPackageJson({ templatesRoot: TEMPLATES, projectRoot: projectDir, tokens, write: true });

  mkdirSync(join(projectDir, '.qcode'), { recursive: true });
  writeFileSync(join(projectDir, '.qcode/config.json'), JSON.stringify(config, null, 2) + '\n');

  if (answers.git) {
    execFileSync('git', ['init', '-b', 'main'], { cwd: projectDir, stdio: 'pipe' });
    execFileSync('git', ['config', 'core.hooksPath', '.githooks'], { cwd: projectDir, stdio: 'pipe' });
    for (const hook of ['.githooks/pre-commit', '.githooks/status-guard.sh']) {
      const p = join(projectDir, hook);
      if (existsSync(p)) {
        try { chmodSync(p, 0o755); } catch { /* best-effort on platforms without POSIX modes */ }
      }
    }
    if (answers.remote) {
      execFileSync('git', ['remote', 'add', 'origin', answers.remote], { cwd: projectDir, stdio: 'pipe' });
    }
  }

  console.log(`✅ rendered ${report.created.length} files.`);
  console.log(`\nSelf-testing before declaring success...`);
  const problems = selfTest(projectDir);
  if (problems.length) {
    die(`generate produced a scaffold that fails its own self-test:\n\n${problems.join('\n\n')}`);
  }
  console.log(`✅ board:check passes · cockpit renders clean.`);

  const gapCount = countDefineGaps(projectDir, [...report.created, ...report.updated, ...report.upToDate]);

  console.log(`\n────────────────────────────────────────`);
  console.log(`${report.created.length} files created · ${gapCount} (to define) gap(s) left for the charter pass.`);
  console.log(`\nNext step: run the \`qcode-charter\` skill inside ${projectDir}`);
  console.log(`(it fills the ${gapCount} gaps above — the goal, the value model, the roadmap, the`);
  console.log(`architecture — this mode deliberately left them for judgment, not a guess).`);
  if (answers.git) {
    console.log(`\nGit initialized on branch 'main' with the status-guard hook active.`);
    console.log(`The scaffold's own first commit is yours to make — qcode.mjs doesn't commit for you.`);
  }
}

// ── sync ─────────────────────────────────────────────────────────────────────────────────────────
//
//   node qcode.mjs sync <project-dir> [--write] [--force]
//
// Re-renders every framework-owned file (lib/qcode-core.mjs's isFrameworkOwned — skills/, githooks/,
// ci/, scripts/, cockpit/) against the project's own recorded tokens. Dry-run by default; --write
// applies, backing up every changed file first (the existing `.qcode-bak` convention). A file the
// project has declared `customized` in its config is reported but never overwritten without --force.

async function sync(args) {
  const targetArg = args._[0];
  if (!targetArg) die('usage: node qcode.mjs sync <project-dir> [--write] [--force]');
  const projectDir = resolve(targetArg);
  const write = !!args.write;
  const force = !!args.force;

  const config = loadConfig(projectDir);
  if (!config) die(`no .qcode/config.json at ${projectDir} — not a qcode-method project (run generate first)`);

  console.log(`\nQCode-Method sync — ${projectDir}`);
  console.log(write ? '(writing)\n' : '(dry-run — pass --write to apply)\n');

  const report = renderProject({
    templatesRoot: TEMPLATES,
    projectRoot: projectDir,
    tokens: config.tokens,
    config,
    write,
    force,
    filterOwner: 'framework',
  });

  console.log(`  created         : ${report.created.length}`);
  console.log(`  updated         : ${report.updated.length}`);
  console.log(`  up to date      : ${report.upToDate.length}`);
  console.log(`  customized      : ${report.customized.length}${report.customized.length ? ' (skipped — pass --force to overwrite)' : ''}`);
  if (report.skippedMissingTokens.length) {
    console.log(`  ⚠ skipped (missing token — a qcode.mjs bug, please report): ${report.skippedMissingTokens.length}`);
  }

  for (const e of [...report.updated, ...report.customized]) {
    const tag = report.customized.includes(e) ? ' [CUSTOMIZED]' : '';
    console.log(`\n--- ${e.targetRelPath}${tag}\n${e.diff}`);
  }

  if (write) {
    const frameworkVersion = readFileSync(join(ROOT, 'VERSION'), 'utf8').trim();
    const newConfig = { ...config, frameworkVersion, syncedAt: new Date().toISOString().slice(0, 10) };
    mkdirSync(join(projectDir, '.qcode'), { recursive: true });
    writeFileSync(join(projectDir, '.qcode/config.json'), JSON.stringify(newConfig, null, 2) + '\n');
    console.log(`\n✅ synced — .qcode/config.json now records frameworkVersion ${frameworkVersion}.`);
  } else {
    console.log(`\nDry run only — pass --write to apply.`);
  }
}

// ── check ────────────────────────────────────────────────────────────────────────────────────────
//
//   node qcode.mjs check <project-dir>
//
// Two distinct signals, reported separately, because an incomplete-but-valid project is not the
// same as a broken one: STRUCTURAL VALIDITY (board:check passes, cockpit renders — reuses generate's
// own selfTest, so "valid" means the same thing in both modes) and COMPLETENESS (how many
// `(to define: ...)` gaps remain anywhere in the tree — a plain recursive walk, not the render
// manifest, since `check` runs against a project that may have drifted from any single template
// snapshot). Exit code reflects structural validity only; an open gap count is never a failure.

function countDefineGapsInTree(projectDir) {
  const SKIP_DIRS = new Set(['.git', 'node_modules', '.qcode-bak']);
  let count = 0;
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      if (SKIP_DIRS.has(entry)) continue;
      const abs = join(dir, entry);
      const st = statSync(abs);
      if (st.isDirectory()) walk(abs);
      else if (entry.endsWith('.md')) {
        const matches = readFileSync(abs, 'utf8').match(/\(to define:/g);
        if (matches) count += matches.length;
      }
    }
  };
  walk(projectDir);
  return count;
}

async function check(args) {
  const targetArg = args._[0];
  if (!targetArg) die('usage: node qcode.mjs check <project-dir>');
  const projectDir = resolve(targetArg);

  // Deliberately NOT gated on .qcode/config.json — unlike sync (which genuinely can't function
  // without the recorded tokens it re-renders from), check's two jobs (self-test, gap-count) are
  // both plain filesystem operations that need no config at all. QCode-Method's own repo is the
  // proof this matters: it was hand-bootstrapped by story 01.1, never run through `generate`, so it
  // has no config.json — yet this story's own acceptance criteria require `qcode check .` to work
  // against it right after migrate. PROJECT-STATUS.md's presence is the real "is this a
  // qcode-method project" signal, matching the same gate migrate itself uses.
  if (!existsSync(join(projectDir, 'PROJECT-STATUS.md'))) {
    die(`no PROJECT-STATUS.md at ${projectDir} — not a qcode-method project`);
  }
  const config = loadConfig(projectDir);

  console.log(`\nQCode-Method check — ${projectDir}`);
  console.log(config ? `(config.json: frameworkVersion ${config.frameworkVersion})\n` : '(no .qcode/config.json — a hand-bootstrapped project, not a generated one)\n');

  const problems = selfTest(projectDir);
  const structurallyValid = problems.length === 0;

  if (structurallyValid) {
    console.log('✅ structurally valid — board:check passes, cockpit renders clean.');
  } else {
    console.log('❌ NOT structurally valid:');
    for (const p of problems) console.log(`\n${p}`);
  }

  const gapCount = countDefineGapsInTree(projectDir);
  console.log(`\n${gapCount} (to define) gap(s) open.`);
  console.log(
    gapCount === 0
      ? 'Complete — every judgment gap has been resolved.'
      : 'Incomplete but valid: run qcode-charter (or resolve the gaps directly) to close them — an\nopen gap is not the same failure as a structural break.'
  );

  process.exit(structurallyValid ? 0 : 1);
}

// ── migrate ──────────────────────────────────────────────────────────────────────────────────────
//
//   node qcode.mjs migrate <project-dir> [--write]
//
// Converts a v1-shaped backlog (flat `backlog/epic-NN-slug.md` files, a "Recently done" log on
// PROJECT-STATUS.md) into the v2 ADR-059 shape (story-is-a-file, an open-work-only board, an
// append-only `backlog/CLOSED.md`). Dry-run by default — always inspect the plan before --write.
//
// Built on T9's discipline (Mompa's own ten single-use migration scripts): split flat files, derive
// index rows from structure (never invent one — lib/qcode-migrate.mjs's renderEpicReadme takes only
// the id + the story's own title), verify relocation losslessly. The splitting/parsing logic itself
// lives in lib/qcode-migrate.mjs as pure, unit-tested functions (see qcode-migrate.test.mjs,
// including the two real shapes this repo's own epic-02 and epic-03 files exercise: closures that
// land out of story order, and a closure block sitting textually before its own story heading) —
// this function is the thin, file-system-touching orchestration around it.

async function migratePlan(projectDir) {
  const backlogDir = join(projectDir, 'backlog');
  const statusPath = join(projectDir, 'PROJECT-STATUS.md');
  if (!existsSync(statusPath)) die(`no PROJECT-STATUS.md at ${projectDir} — not a qcode-method project`);
  if (existsSync(join(backlogDir, 'CLOSED.md'))) {
    return { alreadyMigrated: true };
  }

  const epicFiles = readdirSync(backlogDir).filter((f) => /^epic-\d{2}-[a-z0-9-]+\.md$/.test(f)).sort();
  if (!epicFiles.length) die(`no flat backlog/epic-NN-*.md files found under ${backlogDir} — nothing to migrate`);

  const statusMd = readFileSync(statusPath, 'utf8');
  const epicsTableRows = parseEpicsTable(statusMd);
  const recentlyDone = parseRecentlyDone(statusMd);

  const epics = epicFiles.map((file) => {
    const { slug, num } = parseEpicFilename(file);
    return { file, slug, num, ...parseV1Epic(readFileSync(join(backlogDir, file), 'utf8')) };
  });
  const slugByNum = new Map(epics.map((e) => [e.num, e.slug]));

  // Cross-validate the two independent sources of "what's closed" before trusting either — a
  // mismatch here is a real data problem worth surfacing, not something to silently paper over.
  const closureIds = new Set(epics.flatMap((e) => e.closures.map((c) => c.id)));
  const recentIds = new Set(recentlyDone.map((r) => r.id));
  const warnings = [];
  for (const id of closureIds) if (!recentIds.has(id)) warnings.push(`${id} has a #### Closed block in its epic file but no row in PROJECT-STATUS.md's Recently-done table`);
  for (const id of recentIds) if (!closureIds.has(id)) warnings.push(`${id} has a Recently-done row but no #### Closed block in any epic file`);
  for (const stub of epics.flatMap((e) => e.droppedStubs)) warnings.push(`dropped a non-story-id "#### Closed:" heading (expected — a not-yet-filled-in placeholder): ${stub}`);

  const writes = [];
  const deletes = [];

  for (const epic of epics) {
    const storiesById = new Map(epic.stories.map((s) => [s.id, s]));
    const closuresById = new Map(epic.closures.map((c) => [c.id, c]));
    const storyOrder = [...storiesById.keys()].sort(compareStoryIds);

    for (const id of storyOrder) {
      writes.push({ path: `backlog/${epic.slug}/${id}.md`, content: renderStoryFile(storiesById.get(id), closuresById.get(id) ?? null) });
    }
    writes.push({ path: `backlog/${epic.slug}/README.md`, content: renderEpicReadme({ title: epic.title, preamble: epic.preamble, storyOrder, storiesById }) });
    deletes.push(`backlog/${epic.file}`);
  }

  // backlog/CLOSED.md — template boilerplate header (append-only rules, universal across every
  // migrated project) + one row per Recently-done entry, in its existing (already-chronological)
  // order, each Detail link recomputed directly from the id rather than reverse-parsed from the
  // old anchor — simpler and can't drift from what the row actually says its id is.
  const closedTemplate = readFileSync(join(TEMPLATES, 'backlog/CLOSED.md'), 'utf8');
  const sepLine = '|---|---|---|---|';
  const closedHeader = closedTemplate.slice(0, closedTemplate.indexOf(sepLine) + sepLine.length);
  const closedRows = recentlyDone.map((r) => {
    const slug = slugByNum.get(r.id.split('.')[0]);
    return renderClosedRow({ id: r.id, date: r.date, detailLinkText: r.detailText, detailHref: slug ? `${slug}/${r.id}.md` : r.detailHref });
  });
  writes.push({ path: 'backlog/CLOSED.md', content: `${closedHeader}\n${closedRows.join('\n')}\n` });

  // backlog/ACCEPTED.md — the template stub verbatim; QCode-Method has no accepted-but-unplanned
  // decisions of its own to carry forward.
  writes.push({ path: 'backlog/ACCEPTED.md', content: readFileSync(join(TEMPLATES, 'backlog/ACCEPTED.md'), 'utf8') });

  // PROJECT-STATUS.md — href fixes (applied globally, not just inside specific table cells — the
  // "Last shipped" narrative bullet reuses the exact same href as its Recently-done row, and a
  // fix scoped only to the Recently-done table missed it entirely on the first pass against this
  // repo's own real content), then section surgery (drop the now-obsolete v1-shape callout and
  // "Recently done", add "Needs status review" + the two new index links) — everything else on
  // the board (the Updated/Phase line, the Last-shipped/Next-up narrative text itself, "How status
  // works") is the project's own content and is preserved untouched.
  const { tableRows, cells, extractId } = await import(
    `file://${join(TEMPLATES, 'scripts/board-check.mjs').replace(/\\/g, '/')}`
  );

  const hrefFixes = new Map(); // old href string -> new href string, collected from every table we understand
  for (const row of epicsTableRows) {
    const m = row.detailHref?.match(/^backlog\/(epic-\d{2}-[a-z0-9-]+)\.md$/);
    if (m) hrefFixes.set(row.detailHref, `backlog/${m[1]}/README.md`);
  }
  for (const row of recentlyDone) {
    const slug = slugByNum.get((row.id || '').split('.')[0]);
    if (slug && row.detailHref) hrefFixes.set(row.detailHref, `backlog/${slug}/${row.id}.md`);
  }
  for (const row of tableRows(statusMd, '| Story | Status | Link |')) {
    const c = cells(row);
    const id = extractId(c[0] || '');
    const hrefMatch = /\]\(([^)]+)\)/.exec(c[2] || '');
    const slug = id && slugByNum.get(id.split('.')[0]);
    if (slug && hrefMatch) hrefFixes.set(hrefMatch[1], `backlog/${slug}/${id}.md`);
  }

  let newStatus = statusMd;
  for (const [oldHref, newHref] of hrefFixes) newStatus = newStatus.split(`](${oldHref})`).join(`](${newHref})`);

  newStatus = newStatus.replace(/> \*\*v1 board shape, deliberately\.\*\*[\s\S]*?\n\n(?=\*\*Updated)/, '');

  // Section surgery below uses explicit index splicing rather than regex whitespace lookahead — a
  // non-greedy `[\s\S]*?` consuming "up to the next heading" doesn't reliably leave exactly one
  // blank line on either side once something is inserted or removed; splicing on a known heading
  // string and normalizing each side's own whitespace explicitly does.

  /** Removes a whole `## heading` section (heading + its content) up to the next `## ` heading. */
  const removeSection = (md, headingLine) => {
    const at = md.indexOf(headingLine);
    if (at === -1) return md;
    const nextAt = md.indexOf('\n## ', at);
    const before = md.slice(0, at).replace(/\n+$/, '');
    const after = nextAt === -1 ? '' : md.slice(nextAt).replace(/^\n+/, '');
    return after ? `${before}\n\n${after}` : before;
  };

  /** Inserts a new `## `-headed section right after an existing section's own content ends. */
  const insertSectionAfter = (md, existingHeadingLine, newSection) => {
    const at = md.indexOf(existingHeadingLine);
    if (at === -1) return md;
    const nextAt = md.indexOf('\n## ', at);
    const head = (nextAt === -1 ? md : md.slice(0, nextAt)).replace(/\n+$/, '');
    const tail = nextAt === -1 ? '' : md.slice(nextAt).replace(/^\n+/, '');
    return tail ? `${head}\n\n${newSection}\n\n${tail}` : `${head}\n\n${newSection}`;
  };

  /** Inserts `content` right after a heading LINE itself, before whatever already follows it. */
  const insertAfterHeading = (md, headingLine, content) => {
    const at = md.indexOf(headingLine);
    if (at === -1) return md;
    const afterHeading = at + headingLine.length;
    return md.slice(0, afterHeading) + '\n\n' + content + md.slice(afterHeading);
  };

  newStatus = removeSection(newStatus, '## Recently done — the increment log');

  // "How status works" is prose, not a parsed table — but its own last bullet describes the exact
  // mechanism this migration just changed ("moves to Recently done"), which is now false the moment
  // that section is gone. This is a direct consequence of the shape change, not new content, so
  // it's in scope the same way the href fixes are — the wording matches the v2 template's own.
  newStatus = newStatus.replace(
    /- A story gets its own row under \*\*Active increments\*\* when its subagent pass starts, then moves to\n\s*\*\*Recently done\*\* once its QA pass confirms the acceptance criteria and it's committed\./,
    '- A story gets its own row under **Active increments** when work starts. It comes **off** this board —\n  never into a "done" section here — the moment `tech-qa` passes it: that same commit appends its row\n  to [`backlog/CLOSED.md`](backlog/CLOSED.md) and flips it to `done`.'
  );

  if (!newStatus.includes('## Needs status review')) {
    newStatus = insertSectionAfter(
      newStatus,
      '## Active increments',
      `## Needs status review\n\nStories the board can't confirm — a claimed status with no merged PR behind it. A to-do list, not a\nstatus: resolve each by checking the PR/branch and correcting or removing the row. **None yet.**`
    );
  }

  // Guarded on the bullet's own unique label, not a generic "backlog/CLOSED.md" substring — the
  // "How status works" fix just above also mentions that path by name, which made this guard
  // false-positive (already-present) on this repo's own first real run and silently dropped both
  // bullets below. Caught only by reading the actual migrated PROJECT-STATUS.md, not assumed clean.
  if (!newStatus.includes('**Closed work (shipped stories)**')) {
    newStatus = insertAfterHeading(
      newStatus,
      '## Where the detail lives',
      `- **Closed work (shipped stories)** → [backlog/CLOSED.md](backlog/CLOSED.md) — append-only index.\n` +
        `- **Accepted-but-not-yet-planned decisions** → [backlog/ACCEPTED.md](backlog/ACCEPTED.md)`
    );
  }

  writes.push({ path: 'PROJECT-STATUS.md', content: newStatus });

  return { epics, epicsTableRows, recentlyDone, slugByNum, warnings, writes, deletes, statusMd, epicFiles };
}

// A genuinely v1 project predates the v2 OPERATIONAL tooling (board-check.mjs, its fixtures, the CI
// template, ...) by definition — it may not even have .qcode/config.json (QCode-Method's own repo
// doesn't; it was hand-bootstrapped by story 01.1, before board-check.mjs existed). Without this,
// "board:check exits 0 immediately after migrate" — this story's own acceptance criterion — would be
// untestable: the script that check needs wouldn't exist yet. Runs on EVERY migrate call, including
// one against an already-migrated backlog — refreshing the operational tooling is itself idempotent
// and useful on its own (a project that migrated once but never re-ran this after the framework's
// scripts/cockpit/CI templates changed shouldn't have to re-migrate its whole backlog to catch up).
//
// Installs just scripts/ + cockpit/ + githooks/ + ci/ (what board:check, check:links, and the
// cockpit actually need), deliberately NOT skills/ — installing the full lifecycle-gate skill set is
// a separate, much bigger decision (whether an existing project adopts product-check/tech-planning/
// tech-build/tech-qa) that migrate's own acceptance criteria don't ask for, and doing it blindly here
// broke check:links on this repo's own first real run: those skills reference CLAUDE.md/architecture/
// product/ paths a real scaffolded consumer project has and QCode-Method's own repo doesn't (it's the
// framework, not a project built on it). `sync`, run deliberately by a project that HAS chosen to
// adopt the gates, is where installing skills/ belongs.
function installOperationalTooling(projectDir) {
  const OPERATIONAL_PREFIXES = ['scripts/', 'cockpit/', 'githooks/', 'ci/'];
  const config = loadConfig(projectDir);
  const tokens = config?.tokens ?? { ...CHARTER_DEFERRED_TOKENS, PROJECT_NAME: basename(projectDir) };
  const operationalManifest = resolveManifest(TEMPLATES, config ?? {}).filter((e) =>
    OPERATIONAL_PREFIXES.some((p) => e.templateRelPath.startsWith(p))
  );
  const report = renderProject({
    templatesRoot: TEMPLATES,
    projectRoot: projectDir,
    tokens,
    config: config ?? {},
    manifest: operationalManifest,
    write: true,
  });
  console.log(
    `✅ operational tooling installed/refreshed (scripts/cockpit/githooks/ci) — ${report.created.length} created, ` +
      `${report.updated.length} updated, ${report.upToDate.length} already current.`
  );
}

async function migrate(args) {
  const targetArg = args._[0];
  if (!targetArg) die('usage: node qcode.mjs migrate <project-dir> [--write]');
  const projectDir = resolve(targetArg);
  const write = !!args.write;

  const plan = await migratePlan(projectDir);
  if (plan.alreadyMigrated) {
    console.log(`✅ ${projectDir} already has backlog/CLOSED.md — already v2-shaped.`);
    if (write) installOperationalTooling(projectDir);
    else console.log('(dry-run — pass --write to still refresh the operational tooling.)');
    return;
  }

  console.log(`\nQCode-Method migrate — ${projectDir}`);
  console.log(write ? '(writing)\n' : '(dry-run — pass --write to apply)\n');

  console.log(`${plan.epics.length} epic file(s) found: ${plan.epicFiles.join(', ')}`);
  for (const e of plan.epics) {
    console.log(`  ${e.file} -> backlog/${e.slug}/  (${e.stories.length} stor${e.stories.length === 1 ? 'y' : 'ies'}, ${e.closures.length} closed)`);
  }
  console.log(`\n${plan.writes.length} file(s) to write, ${plan.deletes.length} file(s) to delete:`);
  for (const w of plan.writes) console.log(`  write  ${w.path}`);
  for (const d of plan.deletes) console.log(`  delete ${d}`);

  if (plan.warnings.length) {
    console.log(`\n⚠ ${plan.warnings.length} warning(s):`);
    for (const w of plan.warnings) console.log(`  - ${w}`);
  }

  if (!write) {
    console.log(`\nDry run only — pass --write to apply.`);
    return;
  }

  for (const w of plan.writes) {
    const abs = join(projectDir, w.path);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, w.content);
  }
  for (const d of plan.deletes) {
    rmSync(join(projectDir, d));
  }

  console.log(`\n✅ migrated — ${plan.writes.length} file(s) written, ${plan.deletes.length} deleted.`);

  installOperationalTooling(projectDir);

  console.log(`\nRun \`node scripts/board-check.mjs\` (from inside ${projectDir}) to confirm the board is true.`);
}

// ── CLI dispatch. ────────────────────────────────────────────────────────────────────────────────

const [, , mode, ...rest] = process.argv;
const args = parseArgs(rest);

const MODES = { generate, sync, check, migrate };
if (mode && MODES[mode]) {
  await MODES[mode](args);
} else if (!mode) {
  die(`usage: node qcode.mjs <${Object.keys(MODES).join('|')}> ...`);
} else {
  die(`unknown mode "${mode}" — expected one of: ${Object.keys(MODES).join(', ')}`);
}
