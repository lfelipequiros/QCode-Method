#!/usr/bin/env node
// Additive index rows for an epic README's `## Stories` table.
//
// A row's id comes from a story file's NAME, its title from that file's own
// `### <id> — Title` heading, and its link from the file's path. Nothing is
// summarized, nothing is invented: if a story file's first line doesn't match that
// heading shape, this STOPS and reports it rather than writing a made-up row — an
// unindexed story is at least findable by reading the directory; a wrongly-titled
// index row is a lie that looks authoritative.
//
// This pass is ADDITIVE ONLY: it inserts whole new lines and never rewrites an
// existing byte. `git diff --numstat` after running this should report only `+`
// lines for the README(s) it touched.
//
// Usage:
//   node scripts/index-backlog.mjs --file backlog/<epic-dir>/<id>.md   # index one story
//   node scripts/index-backlog.mjs --check                            # report unindexed stories
//   node scripts/index-backlog.mjs --check --fix                      # ...and add their rows

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const STORY_HEADING_RE = /^###\s+(\S+)\s+[—-]\s+(.+?)\s*$/;

/** Parse a story file's first line as `### <id> — <Title>`. Returns null if it doesn't match. */
export function parseStoryHeading(content) {
  const firstLine = content.split('\n', 1)[0] ?? '';
  const m = STORY_HEADING_RE.exec(firstLine);
  return m ? { id: m[1], title: m[2] } : null;
}

/** Every story file under `backlog/<epic-dir>/` — never the epic's own README. */
export function storyFilesIn(epicDir, root = ROOT) {
  const abs = join(root, 'backlog', epicDir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs)
    .filter((f) => f.endsWith('.md') && f !== 'README.md')
    .map((f) => ({ file: f, path: join(abs, f) }));
}

/** True if `id` already has a `[id](...)` row under README's `## Stories` heading. */
function alreadyIndexed(readmeContent, id) {
  const lines = readmeContent.split('\n');
  const at = lines.findIndex((l) => l.trim() === '## Stories');
  if (at === -1) return false;
  const idRe = new RegExp(`\\[${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]\\(`);
  for (let i = at + 1; i < lines.length; i++) {
    if (/^##\s/.test(lines[i])) break;
    if (idRe.test(lines[i])) return true;
  }
  return false;
}

/**
 * Insert `| [id](id.md) | title |` under README's `## Stories` heading. Creates the
 * heading (with a table header) immediately before the first other `##` heading if
 * the README doesn't have one yet. Never touches an existing row. Returns the new
 * README content; the caller decides whether to write it (so --check can dry-run).
 */
export function insertIndexRow(readmeContent, id, title, linkTarget) {
  const row = `| [${id}](${linkTarget}) | ${title} |`;
  const lines = readmeContent.split('\n');
  const at = lines.findIndex((l) => l.trim() === '## Stories');

  if (at === -1) {
    // No Stories section yet — create one right before the first other `##`, or at
    // the end of the file if there isn't one.
    const firstOtherHeading = lines.findIndex((l) => /^##\s/.test(l));
    const block = ['## Stories', '', '| Story | Title |', '|---|---|', row, ''];
    const insertAt = firstOtherHeading === -1 ? lines.length : firstOtherHeading;
    lines.splice(insertAt, 0, ...block);
    return lines.join('\n');
  }

  // Find the end of the existing table (first non-`|` line after the heading, or the
  // next `##` heading) and insert the new row there — after the last existing row.
  let insertAt = at + 1;
  let sawHeaderRule = false;
  for (let i = at + 1; i < lines.length; i++) {
    if (/^##\s/.test(lines[i])) {
      insertAt = i;
      break;
    }
    if (!lines[i].startsWith('|')) {
      if (sawHeaderRule) {
        insertAt = i;
        break;
      }
      continue;
    }
    if (/^\|[\s|:-]+\|$/.test(lines[i])) sawHeaderRule = true;
    insertAt = i + 1;
  }
  lines.splice(insertAt, 0, row);
  return lines.join('\n');
}

/** Index one story file. Throws a descriptive Error rather than guessing on a bad heading. */
export function indexOneFile(relFilePath, root = ROOT) {
  const absPath = join(root, relFilePath);
  if (!existsSync(absPath)) throw new Error(`no such file: ${relFilePath}`);

  const content = readFileSync(absPath, 'utf8');
  const heading = parseStoryHeading(content);
  if (!heading) {
    throw new Error(
      `${relFilePath}: first line is not a "### <id> — <Title>" heading — refusing to index. ` +
        `Fix the heading (its id must match the filename) and re-run.`
    );
  }

  const parts = relFilePath.split('/'); // backlog/<epic-dir>/<file>.md
  const epicDir = parts[1];
  const fileName = parts[parts.length - 1];
  const readmePath = join(root, 'backlog', epicDir, 'README.md');
  if (!existsSync(readmePath)) throw new Error(`no README.md for epic dir: backlog/${epicDir}/`);

  const readmeContent = readFileSync(readmePath, 'utf8');
  if (alreadyIndexed(readmeContent, heading.id)) {
    return { id: heading.id, title: heading.title, action: 'no-op (already indexed)' };
  }

  const updated = insertIndexRow(readmeContent, heading.id, heading.title, fileName);
  writeFileSync(readmePath, updated, 'utf8');
  return { id: heading.id, title: heading.title, action: `indexed in backlog/${epicDir}/README.md` };
}

/** Every story file under every epic dir, with whether it's currently indexed. */
export function scanUnindexed(root = ROOT) {
  const backlog = join(root, 'backlog');
  const out = [];
  for (const d of readdirSync(backlog)) {
    const abs = join(backlog, d);
    if (!statSync(abs).isDirectory()) continue;
    const readmePath = join(abs, 'README.md');
    const readmeContent = existsSync(readmePath) ? readFileSync(readmePath, 'utf8') : '';
    for (const { file, path } of storyFilesIn(d, root)) {
      const heading = parseStoryHeading(readFileSync(path, 'utf8'));
      const relFile = `backlog/${d}/${file}`;
      if (!heading) {
        out.push({ relFile, indexed: false, error: 'unparseable heading' });
        continue;
      }
      out.push({ relFile, id: heading.id, indexed: alreadyIndexed(readmeContent, heading.id) });
    }
  }
  return out;
}

// ── CLI.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const fileArg = args.includes('--file') ? args[args.indexOf('--file') + 1] : null;
  const checkMode = args.includes('--check');
  const fixMode = args.includes('--fix');

  if (fileArg) {
    try {
      const result = indexOneFile(fileArg);
      console.log(`✅ ${result.id} — "${result.title}" — ${result.action}`);
      process.exit(0);
    } catch (err) {
      console.error(`❌ index-backlog: ${err.message}`);
      process.exit(1);
    }
  } else if (checkMode) {
    const rows = scanUnindexed();
    const missing = rows.filter((r) => !r.indexed);
    if (missing.length === 0) {
      console.log(`✅ index-backlog --check — all ${rows.length} story files are indexed`);
      process.exit(0);
    }
    console.log(`${missing.length} unindexed story file(s):`);
    for (const m of missing) {
      console.log(`   - ${m.relFile}${m.error ? ` (${m.error})` : ''}`);
    }
    if (fixMode) {
      console.log('\nFixing:');
      let failed = 0;
      for (const m of missing) {
        if (m.error) {
          console.log(`   ⚠ skipped ${m.relFile}: ${m.error} — fix the heading by hand`);
          failed++;
          continue;
        }
        try {
          const result = indexOneFile(m.relFile);
          console.log(`   ✅ ${result.id} — ${result.action}`);
        } catch (err) {
          console.log(`   ❌ ${m.relFile}: ${err.message}`);
          failed++;
        }
      }
      process.exit(failed > 0 ? 1 : 0);
    }
    process.exit(1);
  } else {
    console.error('usage: node scripts/index-backlog.mjs --file <path> | --check [--fix]');
    process.exit(1);
  }
}
