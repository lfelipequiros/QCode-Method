#!/usr/bin/env node
// QCode-Method — qcode-sync
//
// Pull framework improvements (the gate skills, the record-learnings sweep, handoff, the optional
// compass-check, the pre-commit guard, .gitattributes, the cockpit generator) FROM this QCode-Method
// clone INTO a project that was scaffolded by `qcode-project-scaffolder`.
//
// It is DIFF-FIRST and SAFE: it never silently clobbers your work.
//   • Project-owned files (CLAUDE.md, PROJECT-STATUS, backlog/, architecture/, README, the trackers,
//     .env.example, package.json, handoffs/, compass-check/business-context.md) are NEVER touched.
//   • Framework-owned files are re-rendered from the current templates using the tokens recorded in
//     the project's .qcode/config.json, then diffed against what's there. By default it only REPORTS.
//     With --write it applies updates, backing up each changed file to <file>.qcode-bak first, and
//     preserving the cockpit's project-edited LAYERS block.
//
// Usage:
//   node scripts/qcode-sync.mjs <path-to-target-project>            # dry-run: show what would change
//   node scripts/qcode-sync.mjs <path-to-target-project> --write    # apply updates (with backups)
//
// Zero dependencies. Run from a QCode-Method clone.

import { readFileSync, writeFileSync, existsSync, mkdtempSync, copyFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { tmpdir } from 'node:os';

const FRAMEWORK_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATES = join(FRAMEWORK_ROOT, '.claude/skills/qcode-project-scaffolder/assets/templates');

const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const targetArg = args.find((a) => !a.startsWith('--'));

const die = (m) => { console.error(`\n❌ qcode-sync: ${m}\n`); process.exit(1); };
const info = (m) => console.log(m);

if (!targetArg) die('usage: node scripts/qcode-sync.mjs <path-to-target-project> [--write]');
const TARGET = resolve(process.cwd(), targetArg);
if (!existsSync(TARGET)) die(`target project not found: ${TARGET}`);

// ── Framework version (canonical = the scaffolder's VERSION; root VERSION mirrors it) ──────────────
const skillVersionFile = join(TEMPLATES, '..', '..', 'VERSION'); // .../qcode-project-scaffolder/VERSION
const rootVersionFile = join(FRAMEWORK_ROOT, 'VERSION');
const frameworkVersion = readFileSync(skillVersionFile, 'utf8').trim();
if (existsSync(rootVersionFile)) {
  const rootV = readFileSync(rootVersionFile, 'utf8').trim();
  if (rootV !== frameworkVersion)
    console.warn(`⚠️  qcode-sync: root VERSION (${rootV}) != scaffolder VERSION (${frameworkVersion}); a release should keep them in sync.`);
}

// ── Read the target project's QCode config ─────────────────────────────────────────────────────────
const configPath = join(TARGET, '.qcode/config.json');
if (!existsSync(configPath)) die(`no .qcode/config.json in target — was it scaffolded by qcode-project-scaffolder?`);
const config = JSON.parse(readFileSync(configPath, 'utf8'));
const tokens = config.tokens || {};
const compassEnabled = config.compassCheck !== false;

info(`\nQCode-Method sync`);
info(`  framework clone : ${FRAMEWORK_ROOT}  (v${frameworkVersion})`);
info(`  target project  : ${TARGET}  (recorded v${config.frameworkVersion || '?'})`);
info(`  mode            : ${WRITE ? 'WRITE (will apply, with .qcode-bak backups)' : 'dry-run (report only)'}`);
if (config.frameworkVersion === frameworkVersion)
  info(`  → already on v${frameworkVersion}; re-rendering anyway to catch any local edits drift.\n`);
else
  info(`  → updating from v${config.frameworkVersion || '?'} → v${frameworkVersion}\n`);

// ── Framework-owned files this tool manages (template path → target path) ──────────────────────────
// Everything NOT in this list is project-owned and never touched.
const MANAGED = [
  ['skills/tech-planning/SKILL.md',   '.claude/skills/tech-planning/SKILL.md'],
  ['skills/tech-build/SKILL.md',      '.claude/skills/tech-build/SKILL.md'],
  ['skills/tech-qa/SKILL.md',         '.claude/skills/tech-qa/SKILL.md'],
  ['skills/record-learnings/SKILL.md','.claude/skills/record-learnings/SKILL.md'],
  ['skills/handoff/SKILL.md',         '.claude/skills/handoff/SKILL.md'],
  ['githooks/pre-commit',             '.githooks/pre-commit'],
  ['gitattributes',                   '.gitattributes'],
  ['cockpit/generate.mjs',            'cockpit/generate.mjs'],   // LAYERS block preserved
];
if (compassEnabled)
  MANAGED.push(['skills/compass-check/SKILL.md', '.claude/skills/compass-check/SKILL.md']);
// NB: compass-check/business-context.md is intentionally NOT managed — the team fills it in.

const substitute = (s) => s.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in tokens ? tokens[k] : m));

// Preserve a project-edited `const LAYERS = …;` block in the cockpit when re-rendering.
function preserveLayers(rendered, current) {
  const re = /const LAYERS = [\s\S]*?;\n/;
  const cur = current && current.match(re);
  if (cur && !/const LAYERS = null;/.test(cur[0])) return rendered.replace(re, cur[0]);
  return rendered;
}

// Best-effort unified diff via git (no dependency); falls back to a line-count summary.
function showDiff(targetFile, rendered) {
  try {
    const tmp = join(mkdtempSync(join(tmpdir(), 'qcode-')), 'rendered');
    writeFileSync(tmp, rendered);
    const out = execSync(`git --no-pager diff --no-index --no-color -- "${targetFile}" "${tmp}"`,
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return out;
  } catch (e) {
    if (e.stdout) return e.stdout.toString();           // git diff exits 1 when files differ
    const a = readFileSync(targetFile, 'utf8').split('\n').length;
    const b = rendered.split('\n').length;
    return `   (diff unavailable; target ${a} lines, framework ${b} lines)\n`;
  }
}

let updated = 0, upToDate = 0, missing = 0, skipped = 0;

for (const [tpl, rel] of MANAGED) {
  const tplPath = join(TEMPLATES, tpl);
  const tgtPath = join(TARGET, rel);
  if (!existsSync(tplPath)) { console.warn(`⚠️  template missing in framework: ${tpl}`); continue; }

  let rendered = substitute(readFileSync(tplPath, 'utf8'));
  const leftover = rendered.match(/\{\{(\w+)\}\}/g);
  if (leftover) {
    skipped++;
    info(`⏭  ${rel}\n   config.json is missing token(s): ${[...new Set(leftover)].join(', ')} — add them and re-run. Skipped (won't write a half-rendered file).`);
    continue;
  }

  if (!existsSync(tgtPath)) {
    missing++;
    info(`➕  ${rel}  (not in target — would be ADDED${rel.includes('compass-check') ? '; compass-check enabled in config' : ''})`);
    if (WRITE) { ensureDir(tgtPath); writeFileSync(tgtPath, rendered); info(`   ✔ added`); }
    continue;
  }

  const current = readFileSync(tgtPath, 'utf8');
  if (rel === 'cockpit/generate.mjs') rendered = preserveLayers(rendered, current);

  if (current === rendered) { upToDate++; continue; }

  updated++;
  info(`\n✎  ${rel}  — framework update available`);
  info(showDiff(tgtPath, rendered).split('\n').slice(0, 40).map((l) => '   ' + l).join('\n'));
  if (WRITE) {
    copyFileSync(tgtPath, tgtPath + '.qcode-bak');
    writeFileSync(tgtPath, rendered);
    info(`   ✔ written (backup at ${rel}.qcode-bak). RE-CHECK any (to define) edits you'd made here.`);
  }
}

function ensureDir(file) {
  const d = dirname(file);
  if (!existsSync(d)) execSync(`mkdir -p "${d}"`);
}

// ── Summary + version bump ─────────────────────────────────────────────────────────────────────────
info(`\n────────────────────────────────────────`);
info(`up-to-date: ${upToDate}  ·  updates: ${updated}  ·  to-add: ${missing}  ·  skipped: ${skipped}`);

if (WRITE && (updated > 0 || missing > 0)) {
  config.frameworkVersion = frameworkVersion;
  config.syncedAt = new Date().toISOString().slice(0, 10);
  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
  info(`\n✅ applied. Bumped .qcode/config.json → frameworkVersion ${frameworkVersion}.`);
  info(`   Review the diffs, re-apply any project-specific (to define) edits the updates overwrote,`);
  info(`   run \`node cockpit/generate.mjs\` to confirm the cockpit still builds, then commit.`);
} else if (!WRITE && (updated > 0 || missing > 0)) {
  info(`\nDry-run only. Re-run with --write to apply (each changed file is backed up to .qcode-bak first).`);
} else {
  info(`\n✅ Target is already current with framework v${frameworkVersion}. Nothing to do.`);
}
