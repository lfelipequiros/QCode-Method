#!/usr/bin/env node
// lib/qcode-core.mjs — the shared rendering core for QCode-Method's generation engine.
//
// `generate`, `sync`, and `migrate` (epic 05, stories 05.2-05.4) all render the same templates
// against the same tokens. Before this file, that was zero shared code — `scripts/qcode-sync.mjs`
// had its own copy of the resolver, the substitution pass, and the diff/backup logic, and any
// future mode would have grown a THIRD copy. This is the one place that knows how a template
// becomes a target file. Import from here; don't reimplement any of it.
//
// Zero dependencies beyond Node itself and `git` on PATH (used only for diffing — see
// diffAgainstContent — which is the same zero-dependency technique qcode-sync already used).

import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  copyFileSync,
  mkdtempSync,
  readdirSync,
  statSync,
} from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, relative } from 'node:path';
import { tmpdir } from 'node:os';

export const CONFIG_VERSION = 1;

// ── Path mapping — one rule set, so every mode (and SKILL.md's own prose table) agrees. ────────────
//
// Most templates map 1:1 (same relative path in the project). The exceptions are dotfiles/dirs that
// can't be authored as literal dotfiles inside a skill's own asset tree, plus the CI workflow, which
// GitHub requires at a fixed path. Kept as small, explicit rules rather than a hand-maintained
// manifest — a second hand-written list of the same mapping is exactly the kind of drift-risk this
// module exists to remove (see the header above).
const PATH_RULES = [
  { test: (p) => p === 'gitignore', target: () => '.gitignore' },
  { test: (p) => p === 'gitattributes', target: () => '.gitattributes' },
  { test: (p) => p === 'env.example', target: () => '.env.example' },
  { test: (p) => p.startsWith('githooks/'), target: (p) => '.' + p }, // githooks/x -> .githooks/x
  { test: (p) => p === 'ci/board-guard.yml', target: () => '.github/workflows/board-guard.yml' },
  { test: (p) => p.startsWith('skills/'), target: (p) => '.claude/' + p }, // skills/x -> .claude/skills/x
];

/** A template's relative path (POSIX, `/`-separated) → its target relative path in a project. */
export function templateToTargetPath(templateRelPath) {
  const p = templateRelPath.replace(/\\/g, '/');
  for (const rule of PATH_RULES) {
    if (rule.test(p)) return rule.target(p);
  }
  return p; // everything else maps 1:1
}

// ── Ownership — which entries `sync` may touch, vs. what becomes the project's own once generated. ─
//
// Matches the split `qcode-sync` has stated since its first version: skills, hooks, CI, scripts, and
// the cockpit are framework-owned (re-rendered on every sync); everything a project accumulates its
// own content into — the board, the backlog, architecture, the product trackers, README, the env
// files it may hand-edit — is project-owned, and sync/migrate must never touch it.
const FRAMEWORK_OWNED_PREFIXES = ['skills/', 'githooks/', 'ci/', 'scripts/', 'cockpit/'];
const FRAMEWORK_OWNED_EXACT = ['gitattributes'];

export function isFrameworkOwned(templateRelPath) {
  const p = templateRelPath.replace(/\\/g, '/');
  if (FRAMEWORK_OWNED_EXACT.includes(p)) return true;
  return FRAMEWORK_OWNED_PREFIXES.some((prefix) => p.startsWith(prefix));
}

// ── Manifest — every template file under a templates root, with its target + ownership. ───────────

/** Recursively lists every file under `dir`, relative to `dir`, POSIX-separated. */
function walkFiles(dir, base = dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    if (statSync(abs).isDirectory()) {
      out.push(...walkFiles(abs, base));
    } else {
      out.push(relative(base, abs).replace(/\\/g, '/'));
    }
  }
  return out;
}

/**
 * The full set of `{ templateRelPath, targetRelPath, owner }` entries under `templatesRoot`,
 * filtered by `config` (skips `skills/compass-check/**` when `config.compassCheck === false`).
 * `config` may be `{}` for a full, unconditional manifest (e.g. to validate every template parses).
 *
 * `package.json` is deliberately excluded — it needs a structural JSON merge, not a text
 * render-and-diff, so it's handled separately by `renderPackageJson`. `business-context.md` is
 * excluded too: it's compass-check's own file to fill in, never re-rendered even on sync.
 */
export function resolveManifest(templatesRoot, config = {}) {
  const compassEnabled = config.compassCheck !== false;
  return walkFiles(templatesRoot)
    .filter((rel) => compassEnabled || !rel.startsWith('skills/compass-check/'))
    .filter((rel) => rel !== 'skills/compass-check/business-context.md')
    .filter((rel) => rel !== 'package.json')
    .map((rel) => ({
      templateRelPath: rel,
      targetRelPath: templateToTargetPath(rel),
      owner: isFrameworkOwned(rel) ? 'framework' : 'project',
    }));
}

// ── Token substitution — including the whole-line-empty-token rule (found live at 02.2 QA). ────────
//
// A token that sits ALONE on its own line (ignoring surrounding whitespace) and resolves to an
// empty string removes the WHOLE LINE, not just the token text. Left as a blank line, a token like
// `{{EPIC_TABLE}}` silently ends whatever markdown table it sits inside — board-check's row reader
// stops at the first non-`|` line, hiding every row below it (including the ad-hoc bucket's own
// row) from every rule that reads that table. See scripts/OBSERVED-DEFECTS.md — rule 6 — for the
// concrete shape of that defect. A token embedded among other text on a line substitutes inline,
// same as always. A token with NO value in `tokens` at all is left verbatim on either path — never
// silently dropped — so `leftoverTokens` below can catch a genuinely missing answer.
const TOKEN_RE = /\{\{(\w+)\}\}/g;
const WHOLE_LINE_TOKEN_RE = /^\s*\{\{(\w+)\}\}\s*$/;

export function substituteTokens(content, tokens) {
  const out = [];
  for (const line of content.split('\n')) {
    const wholeLineMatch = line.match(WHOLE_LINE_TOKEN_RE);
    if (wholeLineMatch && wholeLineMatch[1] in tokens) {
      const value = String(tokens[wholeLineMatch[1]]);
      if (value === '') continue; // resolves to empty -> drop the whole line, not a blank one
      out.push(value); // may itself embed newlines (a multi-line token value) — join() below handles it
      continue;
    }
    out.push(line.replace(TOKEN_RE, (m, key) => (key in tokens ? String(tokens[key]) : m)));
  }
  return out.join('\n');
}

/** Every `{{TOKEN}}` still present in already-substituted content — a config gap, not a template bug. */
export function leftoverTokens(substitutedContent) {
  const matches = substitutedContent.match(TOKEN_RE);
  return matches ? [...new Set(matches)] : [];
}

// ── Diffing — delegates to `git diff --no-index`, the same zero-dependency technique qcode-sync
// already proved out, rather than a hand-rolled diff algorithm for marginal reporting value. ───────

/** A best-effort unified diff between an existing file's content and newly-rendered content. */
export function diffAgainstContent(currentAbsPath, renderedContent) {
  try {
    const tmpDir = mkdtempSync(join(tmpdir(), 'qcode-diff-'));
    const tmpFile = join(tmpDir, 'rendered');
    writeFileSync(tmpFile, renderedContent);
    return execFileSync(
      'git',
      ['--no-pager', 'diff', '--no-index', '--no-color', '--', currentAbsPath, tmpFile],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    );
  } catch (e) {
    if (e.stdout) return e.stdout.toString(); // git diff exits 1 when files differ — expected, not an error
    const a = existsSync(currentAbsPath) ? readFileSync(currentAbsPath, 'utf8').split('\n').length : 0;
    const b = renderedContent.split('\n').length;
    return `   (diff unavailable; current ${a} lines, rendered ${b} lines)\n`;
  }
}

// ── Backup — every overwrite of an existing file is preceded by one, matching qcode-sync's
// existing `.qcode-bak` convention exactly (so a project already used to that suffix sees no
// change in behavior from this module replacing the tool that used to write it). ───────────────────

/** Backs up `absPath` to `absPath + '.qcode-bak'` before it gets overwritten. Returns the backup path. */
export function backupFile(absPath) {
  const backupPath = absPath + '.qcode-bak';
  copyFileSync(absPath, backupPath);
  return backupPath;
}

// ── The cockpit's one project-editable block survives a re-render. ─────────────────────────────────

/** Preserves a project-edited `const LAYERS = …;` block in the cockpit when re-rendering it. */
export function preserveCockpitLayers(renderedContent, currentContent) {
  const re = /const LAYERS = [\s\S]*?;\n/;
  const cur = currentContent && currentContent.match(re);
  if (cur && !/const LAYERS = null;/.test(cur[0])) return renderedContent.replace(re, cur[0]);
  return renderedContent;
}

// ── Customized-file protection — review-only, never auto-overwritten without --force. ──────────────

/**
 * True if `targetRelPath` is listed (by substring match, matching the convention `qcode-sync`
 * already used for Finosonido's adoption) in the project's `.qcode/config.json` `"customized"`
 * array — a file the project enriched beyond the generic template.
 */
export function isCustomized(targetRelPath, config) {
  const customized = config.customized || [];
  return customized.some((c) => targetRelPath.includes(c));
}

// ── package.json — a structural merge, not a text render, because it's project-owned but v2 needs
// new script entries in it. Excluded from resolveManifest above; handled here instead. ─────────────

/**
 * Merges `templateJson`'s keys into `existingJson`, adding anything missing WITHOUT ever
 * overwriting a key the project already set. Only descends one level into plain-object values
 * (like `"scripts"`, so a project's own custom script survives untouched and only genuinely-new
 * template script keys get added); anything else is added only if the top-level key is absent
 * entirely, never merged deeper.
 */
export function mergePackageJson(existingJson, templateJson) {
  const merged = { ...existingJson };
  for (const [key, value] of Object.entries(templateJson)) {
    if (!(key in merged)) {
      merged[key] = value;
      continue;
    }
    const isPlainObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
    if (isPlainObject(merged[key]) && isPlainObject(value)) {
      merged[key] = { ...value, ...merged[key] }; // existing keys win; missing ones get added
    }
    // else: the existing top-level value wins outright, the template's is discarded — never overwrite
  }
  return merged;
}

/**
 * Renders `package.json` specially: a brand-new project (no existing file) gets the template
 * written directly; an existing one gets `mergePackageJson`'s add-missing-only treatment, backed
 * up first. Returns `{ action: 'created'|'merged'|'upToDate', addedKeys: string[] }` (the script
 * keys that were actually new, for reporting).
 */
export function renderPackageJson({ templatesRoot, projectRoot, tokens, write = false }) {
  const templateAbsPath = join(templatesRoot, 'package.json');
  const targetAbsPath = join(projectRoot, 'package.json');
  const rendered = substituteTokens(readFileSync(templateAbsPath, 'utf8'), tokens);
  const templateJson = JSON.parse(rendered);

  if (!existsSync(targetAbsPath)) {
    if (write) {
      mkdirSync(dirname(targetAbsPath), { recursive: true });
      writeFileSync(targetAbsPath, JSON.stringify(templateJson, null, 2) + '\n');
    }
    return { action: 'created', addedKeys: Object.keys(templateJson.scripts || {}) };
  }

  const existingJson = JSON.parse(readFileSync(targetAbsPath, 'utf8'));
  const merged = mergePackageJson(existingJson, templateJson);
  const addedScriptKeys = Object.keys(templateJson.scripts || {}).filter(
    (k) => !(existingJson.scripts || {})[k]
  );

  if (JSON.stringify(merged) === JSON.stringify(existingJson)) {
    return { action: 'upToDate', addedKeys: [] };
  }

  if (write) {
    backupFile(targetAbsPath);
    writeFileSync(targetAbsPath, JSON.stringify(merged, null, 2) + '\n');
  }
  return { action: 'merged', addedKeys: addedScriptKeys };
}

// ── Config — loaded once per run, validated structurally (no schema-validator dependency; see
// schema/config.schema.json for the full documented contract this checks a useful subset of). ─────

export function loadConfig(projectRoot) {
  const configPath = join(projectRoot, '.qcode', 'config.json');
  if (!existsSync(configPath)) return null;
  return JSON.parse(readFileSync(configPath, 'utf8'));
}

/** Minimal structural check against schema/config.schema.json. Returns problem strings (empty = valid). */
export function validateConfigShape(config) {
  if (typeof config !== 'object' || config === null) return ['config is not an object'];
  const problems = [];
  for (const key of ['configVersion', 'frameworkVersion', 'scaffoldedAt', 'tokens']) {
    if (!(key in config)) problems.push(`missing required key: ${key}`);
  }
  if ('configVersion' in config && typeof config.configVersion !== 'number') {
    problems.push('configVersion must be a number');
  }
  if ('tokens' in config) {
    const t = config.tokens;
    if (typeof t !== 'object' || t === null || Array.isArray(t)) problems.push('tokens must be an object');
  }
  if ('customized' in config && !Array.isArray(config.customized)) {
    problems.push('customized must be an array');
  }
  return problems;
}

// ── The render orchestrator — ties the manifest, substitution, diff, backup, and customized-file
// protection together. Used by `generate` (no filterOwner — a fresh project needs everything) and
// `sync` (filterOwner: 'framework' — only the pieces sync is allowed to touch). ─────────────────────

/**
 * Renders every manifest entry against `tokens`, writing to `projectRoot` when `write` is true
 * (dry-run otherwise, still fully computing what WOULD happen). Returns a report:
 * `{ created, updated, upToDate, customized, skippedMissingTokens }`, each an array of entries
 * (the `updated`/`customized` ones also carry a `diff` string).
 */
export function renderProject({
  templatesRoot,
  projectRoot,
  tokens,
  config = {},
  manifest,
  write = false,
  force = false,
  filterOwner = null,
}) {
  const entries = (manifest ?? resolveManifest(templatesRoot, config)).filter(
    (e) => !filterOwner || e.owner === filterOwner
  );

  const report = { created: [], updated: [], upToDate: [], customized: [], skippedMissingTokens: [] };

  for (const entry of entries) {
    const templateAbsPath = join(templatesRoot, entry.templateRelPath);
    const targetAbsPath = join(projectRoot, entry.targetRelPath);
    const rendered = substituteTokens(readFileSync(templateAbsPath, 'utf8'), tokens);

    const leftover = leftoverTokens(rendered);
    if (leftover.length) {
      report.skippedMissingTokens.push({ ...entry, leftover });
      continue;
    }

    if (!existsSync(targetAbsPath)) {
      report.created.push(entry);
      if (write) {
        mkdirSync(dirname(targetAbsPath), { recursive: true });
        writeFileSync(targetAbsPath, rendered);
      }
      continue;
    }

    const current = readFileSync(targetAbsPath, 'utf8');
    const finalRendered =
      entry.targetRelPath === 'cockpit/generate.mjs' ? preserveCockpitLayers(rendered, current) : rendered;

    if (current === finalRendered) {
      report.upToDate.push(entry);
      continue;
    }

    if (isCustomized(entry.targetRelPath, config) && !force) {
      report.customized.push({ ...entry, diff: diffAgainstContent(targetAbsPath, finalRendered) });
      continue;
    }

    report.updated.push({ ...entry, diff: diffAgainstContent(targetAbsPath, finalRendered) });
    if (write) {
      backupFile(targetAbsPath);
      writeFileSync(targetAbsPath, finalRendered);
    }
  }

  return report;
}
