#!/usr/bin/env node
// lib/qcode-migrate.mjs — v1 (flat epic file, "Recently done" log) -> v2 (ADR-059: story-is-a-file,
// open-board-only, append-only backlog/CLOSED.md) backlog transformation.
//
// Pure parsing/transform functions only. The CLI layer in qcode.mjs is the only place that touches
// the filesystem for real, and only when --write is passed — every function here can be handed a
// literal string fixture and unit-tested without a scratch directory.
//
// Reuses board-check.mjs's own `tableRows`/`cells`/`extractId` (the template copy every scaffolded
// project ships) for parsing PROJECT-STATUS.md's tables, rather than a second implementation of
// "what is a table row" — the same reason 02.4's cockpit rewrite imported them instead of
// reimplementing table parsing. QCode-Method's own repo has no `scripts/board-check.mjs` yet (that's
// exactly what this module is about to fix), so this imports the template source directly.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const BOARD_CHECK_TEMPLATE = join(
  ROOT,
  '.claude/skills/qcode-project-scaffolder/assets/templates/scripts/board-check.mjs'
);
const { tableRows, cells, extractId } = await import(`file://${BOARD_CHECK_TEMPLATE.replace(/\\/g, '/')}`);

export const STORY_ID_PATTERN = String.raw`\d{2}\.\d+[a-z]?`;
const STORY_HEADING_RE = new RegExp(`^### (${STORY_ID_PATTERN}) — (.+)$`);
// Matched in two steps, not one combined regex: a real closure heading is `Closed: ID — DATE`,
// but the "not yet filled in" placeholder some in-progress epics still carry is just
// `Closed: 05.1–05.4` — no ` — DATE` suffix at all (the en-dash between the two ids isn't one).
// A single regex requiring the suffix would silently fail to match the placeholder heading at
// all, leaving it to fall through as plain content onto whatever block was still open — which is
// exactly the bug this two-step match exists to avoid.
const CLOSED_HEADING_ANY_RE = /^#### Closed: (.+)$/;
const CLOSED_HEADING_REAL_RE = new RegExp(`^(${STORY_ID_PATTERN}) — (.+)$`);
const STORY_ID_WHOLE_RE = new RegExp(`^${STORY_ID_PATTERN}$`);

// ── Parsing a single v1 epic file. ──────────────────────────────────────────────────────────────

/**
 * Splits a v1 epic file's full content into:
 *   { title, preamble, stories: [{id,title,body}], closures: [{id,date,body}], droppedStubs: [string] }
 *
 * `body`/closure text is the block's content EXCLUDING its own heading line, trimmed of trailing
 * blank lines. Blocks are found by heading, anywhere in the file — NOT "everything between story
 * N's heading and story N+1's heading belongs to story N." This repo's own real epic files prove
 * why a positional assumption breaks: epic-02's four closures appear in the order
 * 02.1 / 02.3 / 02.4 / 02.2 (close-order, not story order), and epic-03's own `#### Closed: 03.2`
 * block sits textually BEFORE its own `### 03.2` story heading (both stories were closed in one
 * pass; 03.2's own spec section was filled in further down afterward). Matching purely by id,
 * wherever each block actually sits, is the only parse that survives both real files.
 *
 * A `#### Closed: X — ...` heading whose X doesn't match the story-id pattern (an in-progress
 * epic's `_Filled in as each story's subagent pass is QA'd and lands._` placeholder, e.g.
 * `#### Closed: 05.1–05.4`) is dropped, not parsed as a real closure — its heading text is
 * returned in `droppedStubs` so the caller can report rather than silently lose it. It carries no
 * real information (it is, by construction, the state before any real closure existed), so
 * dropping it is correct whenever real per-story closures are also present.
 */
export function parseV1Epic(content) {
  const lines = content.split('\n');

  const storiesAt = lines.findIndex((l) => l.trim() === '## Stories');
  const titleLine = lines.findIndex((l) => l.startsWith('# '));
  if (titleLine === -1) throw new Error('no H1 title line (expected "# Epic NN — Title")');
  const title = lines[titleLine].replace(/^#\s*/, '').trim();

  const preambleLines = storiesAt === -1 ? lines.slice(titleLine + 1) : lines.slice(titleLine + 1, storiesAt);
  // Drop a lone `---` separator line (rule/divider before `## Stories`) — it's formatting, not content.
  while (preambleLines.length && preambleLines[preambleLines.length - 1].trim() === '') preambleLines.pop();
  if (preambleLines.length && preambleLines[preambleLines.length - 1].trim() === '---') preambleLines.pop();
  while (preambleLines.length && preambleLines[preambleLines.length - 1].trim() === '') preambleLines.pop();
  while (preambleLines.length && preambleLines[0].trim() === '') preambleLines.shift();
  const preamble = preambleLines.join('\n');

  const stories = [];
  const closures = [];
  const droppedStubs = [];

  if (storiesAt !== -1) {
    let current = null; // { kind: 'story'|'closure'|'dropped', id, title?, date?, lines: [] }
    const flush = () => {
      if (!current) return;
      const body = current.lines.join('\n').replace(/^\n+/, '').replace(/\n+$/, '');
      if (current.kind === 'story') stories.push({ id: current.id, title: current.title, body });
      else if (current.kind === 'closure') closures.push({ id: current.id, date: current.date, body });
      else droppedStubs.push(current.heading);
      current = null;
    };

    for (let i = storiesAt + 1; i < lines.length; i++) {
      const line = lines[i];
      if (/^##\s/.test(line)) break; // next level-2 heading ends the Stories section

      const storyMatch = line.match(STORY_HEADING_RE);
      const closedMatch = line.match(CLOSED_HEADING_ANY_RE);

      if (storyMatch) {
        flush();
        current = { kind: 'story', id: storyMatch[1], title: storyMatch[2].trim(), lines: [] };
        continue;
      }
      if (closedMatch) {
        flush();
        const real = closedMatch[1].match(CLOSED_HEADING_REAL_RE);
        if (real && STORY_ID_WHOLE_RE.test(real[1])) {
          current = { kind: 'closure', id: real[1], date: real[2].trim(), lines: [] };
        } else {
          current = { kind: 'dropped', heading: line.trim(), lines: [] };
        }
        continue;
      }
      if (current) current.lines.push(line);
    }
    flush();
  }

  return { title, preamble, stories, closures, droppedStubs };
}

/** `"epic-05-generation-engine.md"` -> `{ num: "05", slug: "epic-05-generation-engine" }`. */
export function parseEpicFilename(filename) {
  const m = filename.match(/^(epic-(\d{2})-[a-z0-9-]+)\.md$/);
  if (!m) throw new Error(`not a v1 epic filename: ${filename}`);
  return { slug: m[1], num: m[2] };
}

// ── Rendering v2 files from parsed v1 content. ──────────────────────────────────────────────────

/** One story's v2 per-story file: its spec block, then its closure block if one exists (matched
 *  by id — see parseV1Epic's own note on why position can't be trusted). Verbatim content, just
 *  relocated: this function invents no prose. */
export function renderStoryFile(story, closure) {
  let out = `### ${story.id} — ${story.title}\n\n${story.body}\n`;
  if (closure) {
    out += `\n#### Closed: ${closure.id} — ${closure.date}\n\n${closure.body}\n`;
  }
  return out;
}

/**
 * An epic's v2 README.md: title + preamble (verbatim) + a `## Stories` index table generated FROM
 * the story list (id + title only — never inventing a description a source story doesn't already
 * carry in its own file, matching board-check's own "generate index rows from structure, never
 * invent one").  `storyOrder` is the id list in the order they should appear in the index (numeric
 * story order, not file/closure order).
 */
export function renderEpicReadme({ title, preamble, storyOrder, storiesById }) {
  const rows = storyOrder
    .map((id) => `| [${id}](${id}.md) | ${storiesById.get(id).title} |`)
    .join('\n');
  return `# ${title}\n\n${preamble}\n\n---\n\n## Stories\n\n| Story | Title |\n|---|---|\n${rows}\n`;
}

/** Numeric sort for story ids like "05.10" > "05.2" (lexical sort would get this backwards). */
export function compareStoryIds(a, b) {
  const [aEpic, aStory] = a.split('.');
  const [bEpic, bStory] = b.split('.');
  if (aEpic !== bEpic) return Number(aEpic) - Number(bEpic);
  return parseFloat(aStory) - parseFloat(bStory);
}

// ── PROJECT-STATUS.md parsing — reuses board-check.mjs's own table reader. ─────────────────────

/** Rows of the Epics table: `{ num, name, status, detailHref }`. */
export function parseEpicsTable(projectStatusMd) {
  return tableRows(projectStatusMd, '| # | Epic | Status | Detail |').map((row) => {
    const c = cells(row);
    const hrefMatch = /\]\(([^)]+)\)/.exec(c[3] || '');
    return { num: c[0], name: c[1], status: c[2].replace(/[`*]/g, '').trim(), detailHref: hrefMatch ? hrefMatch[1] : null };
  });
}

/** Rows of the Recently-done log: `{ id, date, detailText, detailHref }`. QCode-Method's v1 shape
 *  keeps this table directly on PROJECT-STATUS.md, in reverse-chronological (most-recent-first)
 *  order — the authoritative row order for the migrated backlog/CLOSED.md, since epic-file closure
 *  dates alone are too coarse (many stories closed the same calendar day) to re-derive it.
 *
 *  A real Detail cell is a markdown link followed by plain prose, e.g. `[epic-05 § 05.3](old/href)
 *  — qcode-charter skill, ...` — `detailText` is the READABLE portion only (the link's own label
 *  plus the trailing prose, concatenated), never the raw cell with its markdown link syntax still
 *  in it; renderClosedRow wraps `detailText` in a brand NEW link pointing at the migrated href, so
 *  keeping the old `[...](...)` syntax inside it would nest one link inside another. */
export function parseRecentlyDone(projectStatusMd) {
  return tableRows(projectStatusMd, '| Story | Date | Detail |').map((row) => {
    const c = cells(row);
    const detailCell = c[2] || '';
    const m = /^\[([^\]]*)\]\(([^)]+)\)(.*)$/.exec(detailCell);
    return {
      id: extractId(c[0] || ''),
      date: c[1],
      detailText: m ? `${m[1]}${m[3]}` : detailCell,
      detailHref: m ? m[2] : null,
    };
  });
}

/** One backlog/CLOSED.md row for a closed story. PR is "—" (no real PR — every story in this
 *  build's actual history was a direct commit on the shared branch, not a merged PR; inventing a
 *  fake link would be worse than an honest dash). */
export function renderClosedRow({ id, date, detailLinkText, detailHref }) {
  return `| ${id} | ${date} | — | [${detailLinkText}](${detailHref}) |`;
}
