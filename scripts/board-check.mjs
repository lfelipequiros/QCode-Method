#!/usr/bin/env node
// The board and the backlog indexes are machine-checked — this proves the ADR-059 shape
// stays TRUE, not just that it was written once. A pre-commit guard (`githooks/status-guard.sh`,
// rule 0 / rule 7, a sibling file) can only ever prove a commit touched the right surfaces;
// it cannot prove the content is still honest. That is this file's job.
//
// Every rule below exists because a shape like it was actually observed breaking — not
// because it seemed like good hygiene in the abstract. The full narrative for each rule (what
// broke, why the rule is shaped the way it is) lives in scripts/OBSERVED-DEFECTS.md. Comments
// on each rule here are one line each and point there rather than re-telling the story.
//
//   1  rule1_noIdOpenAndClosed      — a story is open or closed, never both.
//   2  rule2_idsResolve             — every id resolves to a file; every file is indexed once.
//   3  rule3_statusCellIsAToken     — a Status cell holds a token, not a paragraph.
//   4  rule4_statusInVocab          — the (alias-resolved) token is in the vocabulary.
//   5  rule5_linksResolve           — delegates to check-links.mjs; one predicate, one impl.
//   6  rule6_indexShape             — an index file, and every row in one, stays an index.
//
//   (deliberately no rule "7" here — it fires on a *status event* in the changeset, not on
//   file content, so it lives in githooks/status-guard.sh, built in the next story, 02.3. If
//   you came looking for it and it's not in this file, that's why — it isn't missing.)
//
//   8  rule8_doneEpicHasNoOpenStories — a `done` epic has no open stories left under it.
//
// Config-driven, with defaults that work out of the box: a project overrides the story-id
// pattern, file budgets, or the two length caps via an optional `boardCheck` key in
// `.qcode/config.json` at its root. Widening a budget is then a deliberate, recorded choice —
// not silent drift. See OBSERVED-DEFECTS.md — rule 6.
//
// Zero dependencies beyond Node itself (node:fs, node:path, node:child_process, node:url).
//
// Exit 0 = the board is true. Exit 1 = it is not, with the reason(s).
//
//   node scripts/board-check.mjs

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

import { STATUS_VOCAB, resolveStatus } from './status-vocab.mjs';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ── Config. Built-in defaults a fresh project needs zero configuration to get a working
// checker from; override any of them via `.qcode/config.json`'s optional `boardCheck` key.

export const DEFAULT_STORY_ID_PATTERN = String.raw`\d{2}\.\d+[a-z]?`; // 01.1, 02.3a, 08.12
export const DEFAULT_FILE_BUDGET = {
  'PROJECT-STATUS.md': 24 * 1024,
  'backlog/ACCEPTED.md': 24 * 1024,
  'backlog/00-roadmap.md': 24 * 1024,
};
export const DEFAULT_MAX_STATUS_CELL = 32;
export const DEFAULT_MAX_INDEX_ROW = 240;

/**
 * Reads the optional `boardCheck` key from `<root>/.qcode/config.json` and merges it over the
 * defaults above. Absent file, absent key, unparseable JSON, or a partial object all fall back
 * to defaults (per-key for `fileBudgets`, so adding one bounded file doesn't drop the other
 * two) rather than throwing — a missing or malformed config must never crash the checker.
 */
export function loadBoardCheckConfig(root = ROOT) {
  const configPath = join(root, '.qcode', 'config.json');
  let raw = {};
  if (existsSync(configPath)) {
    try {
      const parsed = JSON.parse(readFileSync(configPath, 'utf8'));
      raw = parsed.boardCheck ?? {};
    } catch (err) {
      console.warn(
        `⚠️  board-check: ${configPath} is not valid JSON (${err.message}); using built-in defaults`
      );
      raw = {};
    }
  }
  return {
    storyIdPattern: raw.storyIdPattern ?? DEFAULT_STORY_ID_PATTERN,
    fileBudgets: { ...DEFAULT_FILE_BUDGET, ...(raw.fileBudgets ?? {}) },
    maxStatusCell: raw.maxStatusCell ?? DEFAULT_MAX_STATUS_CELL,
    maxIndexRow: raw.maxIndexRow ?? DEFAULT_MAX_INDEX_ROW,
  };
}

const CONFIG = loadBoardCheckConfig();
export const STORY_ID_PATTERN = CONFIG.storyIdPattern;
export const FILE_BUDGETS = CONFIG.fileBudgets;
export const MAX_STATUS_CELL = CONFIG.maxStatusCell;
export const MAX_INDEX_ROW = CONFIG.maxIndexRow;

// Bounded on both sides so a longer id never matches as a substring of itself (e.g. `01.1`
// inside `01.10`) and so an id embedded in a link target (`01.1.md`) still matches on the
// id-shaped part.
const ID_ANYWHERE = new RegExp(`(?<![\\w.])(${STORY_ID_PATTERN})(?![\\w])`);

// ── Parsing. Structure only — never prose. A row's id comes from its first cell or its first
// id-shaped token; its status from an existing token. Nothing here summarizes or invents.

/**
 * Rows of the first markdown table anchored at `heading` — either a `##` markdown heading
 * (e.g. `## Stories`) or the literal text of a table's own header row (e.g.
 * `'| Story | Status | Link |'`); either way, scanning starts on the line right after the
 * anchor and the header/separator rows are consumed without being returned. Stops at the next
 * `##` heading, or the first line after the table that is not itself a table row.
 */
export function tableRows(md, heading) {
  const lines = md.split('\n');
  const at = lines.findIndex((l) => l.trim() === heading);
  if (at === -1) return [];
  const rows = [];
  let started = false;
  for (let i = at + 1; i < lines.length; i++) {
    const l = lines[i];
    if (/^##\s/.test(l)) break;
    if (!l.startsWith('|')) {
      if (started) break;
      continue;
    }
    if (/^\|[\s|:-]+\|$/.test(l)) {
      started = true;
      continue;
    }
    if (started) rows.push(l);
  }
  return rows;
}

/** `| a | b | c |` -> `['a', 'b', 'c']`, trimmed. */
export const cells = (row) =>
  row
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());

/** The first id-shaped token anywhere in a cell's text, using the configured story-id pattern. */
export const extractId = (cell) => {
  const m = ID_ANYWHERE.exec(cell || '');
  return m ? m[1] : null;
};

/** `| 01.1 — title | \`planned\` | [link](p) |` -> `{ id, status, statusCell, row }` */
export function parseActive(md) {
  const withHeader = tableRows(md, '| Story | Status | Link |');
  const rows = withHeader.length ? withHeader : tableRows(md, '## Active increments');
  return rows.map(rowToActive);
}
function rowToActive(row) {
  const c = cells(row);
  return {
    id: extractId(c[0] || ''),
    statusCell: c[1] || '',
    status: (c[1] || '').replace(/[`*]/g, '').trim(),
    row,
  };
}

/**
 * CLOSED.md rows: `| id | date | PR | detail |`. A `/`-packed Story cell like `03.1/03.2` is
 * TWO ids on one row — kept, not silently reduced to the first, so rule 6(c) can report the
 * shape rather than a downstream reader quietly mis-attributing the row. A cell that yields no
 * id at all is kept too (as an empty `ids` array) so rule 2 can report it instead of the row
 * disappearing from every check that follows.
 */
export function parseClosed(md) {
  const idWhole = new RegExp(`^(${STORY_ID_PATTERN})$`);
  const out = [];
  for (const line of md.split('\n')) {
    if (!line.startsWith('| ')) continue;
    if (/^\|[\s|:-]+\|$/.test(line)) continue;
    const c = cells(line);
    if (c.length < 4 || c[0] === 'Story') continue;
    const ids = c[0]
      .split('/')
      .map((s) => s.trim())
      .filter((s) => idWhole.test(s));
    out.push({ ids, detail: c[3], row: line, storyCell: c[0] });
  }
  return out;
}

// ── The rules. Each is pure: (inputs) -> string[] of violations, so a test can hand it a
// synthetic fragment and prove it FAILS. A rule with no case proving it can fail is not a rule
// anyone can trust it holds.

// Kills: a story counted as both open and shipped — two answers to "is this done?" at once.
// See OBSERVED-DEFECTS.md — rule 1.
export function rule1_noIdOpenAndClosed(active, closed) {
  const closedIds = new Set(closed.flatMap((r) => r.ids));
  return active
    .filter((a) => a.id && closedIds.has(a.id))
    .map(
      (a) => `rule 1 — ${a.id} is on the open board AND in CLOSED.md; a story is open or closed, never both`
    );
}

// Kills: a board id with no file behind it, and a story file no index ever points at. See
// OBSERVED-DEFECTS.md — rule 2.
export function rule2_idsResolve(active, closed, storyFiles, indexRows) {
  const bad = [];
  const known = new Set(storyFiles.map((f) => f.id));

  for (const a of active) {
    if (!a.id) {
      bad.push(`rule 2 — an Active row has no parseable story id: ${a.row.slice(0, 80)}`);
      continue;
    }
    if (!known.has(a.id)) bad.push(`rule 2 — Active row ${a.id} resolves to no story file`);
  }

  for (const r of closed) {
    if (r.ids.length === 0) {
      bad.push(`rule 2 — CLOSED row's Story cell yields no story id: "${r.storyCell}" (an index cell holds ids)`);
      continue;
    }
    for (const id of r.ids) {
      const m = /\]\(([^)]+)\)/.exec(r.detail || '');
      if (!m) {
        bad.push(`rule 2 — CLOSED row ${id} has no Detail link`);
        continue;
      }
      const target = m[1].split('#')[0];
      if (!existsSync(join(ROOT, 'backlog', target))) {
        bad.push(`rule 2 — CLOSED row ${id} links to a missing file: ${m[1]}`);
      }
    }
  }

  for (const f of storyFiles) {
    const n = indexRows.filter((r) => r.dir === f.dir && r.id === f.id).length;
    if (n === 0) bad.push(`rule 2 — ${f.rel} appears on no epic README index (invisible work)`);
    if (n > 1) bad.push(`rule 2 — ${f.rel} appears ${n} times on its epic README index (ambiguous)`);
  }

  return bad;
}

// Kills: a status cell that grows from a token into a paragraph. See OBSERVED-DEFECTS.md — rule 3.
export function rule3_statusCellIsAToken(rows) {
  return rows
    .filter((r) => r.statusCell.length > MAX_STATUS_CELL)
    .map(
      (r) =>
        `rule 3 — a status cell is ${r.statusCell.length} chars (max ${MAX_STATUS_CELL}); ` +
        `a Status cell holds a token, not a paragraph: ${r.statusCell.slice(0, 60)}…`
    );
}

// Kills: two readers of the same board disagreeing about whether a token is valid. The
// resolveStatus() call is the fix — see OBSERVED-DEFECTS.md — rule 4.
export function rule4_statusInVocab(rows) {
  return rows
    .filter((r) => r.status && !STATUS_VOCAB.includes(resolveStatus(r.status)))
    .map((r) => `rule 4 — "${r.status}" is not a status; the vocabulary is ${STATUS_VOCAB.join(' / ')}`);
}

// Kills: a dead relative link nothing ever checked. See OBSERVED-DEFECTS.md — rule 5. One
// predicate lives in check-links.mjs; this rule calls it rather than re-implementing it, so the
// gate and the standalone `check:links` command can never disagree.
export function rule5_linksResolve({ scriptPath, run = execFileSync } = {}) {
  const target = scriptPath ?? join(ROOT, 'scripts', 'check-links.mjs');
  if (!existsSync(target)) {
    return { violations: [], note: 'rule 5 not yet wired (check-links.mjs not present) — skipping' };
  }
  try {
    run('node', [target], { cwd: ROOT, stdio: 'pipe' });
    return { violations: [], note: null };
  } catch {
    return {
      violations: ['rule 5 — a markdown link does not resolve; run `npm run check:links` for the list'],
      note: null,
    };
  }
}

// Kills: an index file (or a single row in one) outgrowing what "index" means, and a CLOSED.md
// row that packs two ids into one line. See OBSERVED-DEFECTS.md — rule 6.
export function rule6_indexShape(sizes, longRows, closed = []) {
  const bad = [];

  for (const r of closed) {
    if (r.ids.length > 1) {
      bad.push(`rule 6 — CLOSED row names ${r.ids.length} ids ("${r.storyCell}"); an index row names exactly one`);
    }
  }

  for (const [file, budget] of Object.entries(FILE_BUDGETS)) {
    const n = sizes[file];
    if (n === undefined) continue;
    if (n > budget) {
      bad.push(
        `rule 6 — ${file} is ${n} bytes, over its ${budget}-byte budget. It is an INDEX: ids, links ` +
          `and a status. Move the detail to the story or epic file that owns it.`
      );
    }
  }

  for (const r of longRows) {
    bad.push(
      `rule 6 — ${r.file}: an index row is ${r.len} chars (max ${MAX_INDEX_ROW}). An index row is one ` +
        `line: ${r.row.slice(0, 70)}…`
    );
  }

  return bad;
}

// Kills: a `done` epic with an unbuilt story still open under it — a renderer that colours an
// unlogged story from its epic then paints that unbuilt work as shipped. See
// OBSERVED-DEFECTS.md — rule 8.
export function rule8_doneEpicHasNoOpenStories(epicRows, active) {
  const bad = [];
  for (const e of epicRows) {
    if (e.status !== 'done' || !e.num) continue;
    const open = active.filter((a) => a.id && a.id.startsWith(e.num + '.'));
    if (open.length) {
      bad.push(
        `rule 8 — epic ${e.num} is \`done\` but ${open.map((o) => o.id).join(', ')} ` +
          `${open.length === 1 ? 'is' : 'are'} still open`
      );
    }
  }
  return bad;
}

// ── Gathering the real inputs from the project tree. Not exported: these touch the real
// filesystem at ROOT, so they are the CLI's concern, not something a rule test should need.

function storyFiles() {
  const out = [];
  const backlog = join(ROOT, 'backlog');
  for (const d of readdirSync(backlog)) {
    const abs = join(backlog, d);
    if (!statSync(abs).isDirectory()) continue;
    for (const f of readdirSync(abs)) {
      if (!f.endsWith('.md') || f === 'README.md') continue;
      out.push({ dir: d, id: f.replace(/\.md$/, ''), rel: `backlog/${d}/${f}` });
    }
  }
  return out;
}

/** Rows of every epic README's `## Stories` index: `| [01.1](01.1.md) | title |`. */
function indexRows() {
  const out = [];
  const backlog = join(ROOT, 'backlog');
  for (const d of readdirSync(backlog)) {
    const abs = join(backlog, d, 'README.md');
    if (!existsSync(abs)) continue;
    for (const row of tableRows(readFileSync(abs, 'utf8'), '## Stories')) {
      const c = cells(row);
      const m = /\[([^\]]+)\]\(/.exec(c[0] || '');
      if (m) out.push({ dir: d, id: m[1].trim(), row });
    }
  }
  return out;
}

/** Byte size of each configured bounded file, for the ones that exist. */
function fileSizes() {
  const sizes = {};
  for (const file of Object.keys(FILE_BUDGETS)) {
    const abs = join(ROOT, file);
    if (existsSync(abs)) sizes[file] = readFileSync(abs).length;
  }
  return sizes;
}

/**
 * Every table row, across every index surface, that is too long to be an index row. The
 * surfaces are the bounded files, every epic README, and the product surface map — checked
 * even though nothing has built it yet (a later story, 04.1, adds it): checking a file that
 * doesn't exist is a no-op here, not an error, so it's safe to list it up front rather than
 * waiting to wire this in once the file shows up. See OBSERVED-DEFECTS.md — rule 6.
 */
function longIndexRows() {
  const backlog = join(ROOT, 'backlog');
  const epicReadmes = readdirSync(backlog)
    .filter((d) => statSync(join(backlog, d)).isDirectory())
    .map((d) => `backlog/${d}/README.md`);

  const INDEX_FILES = [
    'PROJECT-STATUS.md',
    'backlog/CLOSED.md',
    'backlog/ACCEPTED.md',
    'backlog/00-roadmap.md',
    ...epicReadmes,
    'product/screens-map.md',
  ].filter((f) => existsSync(join(ROOT, f)));

  const out = [];
  for (const file of INDEX_FILES) {
    const md = readFileSync(join(ROOT, file), 'utf8');
    let inFence = false;
    for (const line of md.split('\n')) {
      if (/^\s*```/.test(line)) {
        inFence = !inFence;
        continue;
      }
      if (inFence || !line.startsWith('|')) continue;
      if (line.length > MAX_INDEX_ROW) out.push({ file, row: line, len: line.length });
    }
  }
  return out;
}

// ── CLI. Guarded so importing this module for a test never runs the whole-project scan.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const boardPath = join(ROOT, 'PROJECT-STATUS.md');
  const closedPath = join(ROOT, 'backlog', 'CLOSED.md');
  if (!existsSync(boardPath)) {
    console.error(`❌ board-check: PROJECT-STATUS.md not found at ${boardPath}`);
    process.exit(1);
  }
  if (!existsSync(closedPath)) {
    console.error(`❌ board-check: backlog/CLOSED.md not found at ${closedPath}`);
    process.exit(1);
  }

  const board = readFileSync(boardPath, 'utf8');
  const closedMd = readFileSync(closedPath, 'utf8');

  const active = parseActive(board);
  const closed = parseClosed(closedMd);
  const files = storyFiles();
  const index = indexRows();

  const epicRows = tableRows(board, '| # | Epic | Status | Detail |').map((row) => {
    const c = cells(row);
    return {
      num: /^\d{2}$/.test(c[0] || '') ? c[0] : null,
      statusCell: c[2] || '',
      status: (c[2] || '').replace(/[`*]/g, '').trim(),
      row,
    };
  });
  const statusRows = [...active, ...epicRows];

  const sizes = fileSizes();
  const longRows = longIndexRows();
  const links = rule5_linksResolve();

  const violations = [
    ...rule1_noIdOpenAndClosed(active, closed),
    ...rule2_idsResolve(active, closed, files, index),
    ...rule3_statusCellIsAToken(statusRows),
    ...rule4_statusInVocab(statusRows),
    ...links.violations,
    ...rule6_indexShape(sizes, longRows, closed),
    ...rule8_doneEpicHasNoOpenStories(epicRows, active),
  ];

  console.log(`🧭 board:check — ${active.length} open · ${closed.length} closed · ${files.length} story files`);
  for (const [f, budget] of Object.entries(FILE_BUDGETS)) {
    const n = sizes[f];
    console.log(n === undefined ? `   ${f}: (not present)` : `   ${f}: ${n} / ${budget} bytes`);
  }
  console.log(`   links: ${links.note ?? (links.violations.length ? 'DEAD LINKS' : 'all resolve')}`);

  if (violations.length === 0) {
    console.log('✅ the board is true');
    process.exit(0);
  }
  console.error(`\n❌ ${violations.length} violation(s):\n`);
  for (const v of violations) console.error(`   · ${v}`);
  process.exit(1);
}
