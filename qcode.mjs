#!/usr/bin/env node
// qcode.mjs — the QCode-Method CLI.
//
// Modes: `generate` (this story, 05.2). `sync`/`migrate`/`check` follow in 05.4 — until then,
// `scripts/qcode-sync.mjs` remains the way to pull updates into an already-scaffolded project.
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

import { readFileSync, writeFileSync, existsSync, mkdirSync, chmodSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { createInterface } from 'node:readline/promises';

import { renderProject, renderPackageJson, CONFIG_VERSION } from './lib/qcode-core.mjs';

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

// ── CLI dispatch. ────────────────────────────────────────────────────────────────────────────────

const [, , mode, ...rest] = process.argv;
const args = parseArgs(rest);

if (mode === 'generate') {
  await generate(args);
} else if (!mode) {
  die('usage: node qcode.mjs <generate> ... (sync/migrate/check ship in 05.4)');
} else {
  die(`unknown mode "${mode}" — only "generate" is implemented so far (sync/migrate/check ship in 05.4)`);
}
