#!/usr/bin/env node
// Markdown link checker — every relative link in the repo's TRACKED docs resolves,
// file and anchor.
//
// SCOPE: TRACKED FILES ONLY. Walking the filesystem instead would make the answer
// depend on whatever happens to be sitting in the working tree — a scratch file, a
// vendor doc that's gitignored. That's fatal for a gate: CI checks out only tracked
// content, so a filesystem-walking checker and this same script run in CI could
// silently check different file sets, defeating the one-predicate guarantee
// `status-guard.sh` depends on. `git ls-files` makes the check deterministic instead.
//
// Exits non-zero on any dead link, so it's usable as a gate directly. Zero dependencies.
//
//   node scripts/check-links.mjs

import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, posix } from 'node:path';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Every tracked `.md` file, repo-relative, POSIX-separated. */
export function trackedMarkdownFiles(root = ROOT) {
  const out = execFileSync('git', ['ls-files', '--', '*.md'], { cwd: root, encoding: 'utf8' });
  return out.split('\n').filter(Boolean);
}

// `[text](target)` — not a full CommonMark parser, deliberately: this only needs to find
// link targets, not render anything, and a permissive regex catches every real link this
// repo's docs actually use without the maintenance cost of a real parser.
const LINK_RE = /\[[^\]]*\]\(([^)]+)\)/g;

const isExternal = (target) => /^(https?:|mailto:)/.test(target);
const isPureAnchor = (target) => target.startsWith('#');

/**
 * GitHub's own heading→anchor slugify (matches `github-slugger`, what GitHub's renderer
 * actually uses): lowercase, drop anything that isn't a word char / hyphen / space, then
 * turn EACH space into its own hyphen — never collapsed. That last part is the part worth
 * a comment: a heading like "Foo — Bar" drops the em-dash (not a word char) but keeps
 * BOTH spaces around it, so it anchors as `foo--bar` — a double hyphen where the dash
 * used to be, not a single one. Collapsing runs of hyphens (the more "obvious" regex)
 * produces the wrong anchor for exactly this common case.
 */
export function slugify(heading) {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[^\w\- ]/g, '')
    .replace(/ /g, '-');
}

/** Every `#`/`##`/`###`/… heading's slug in a markdown file's text. */
export function headingSlugs(md) {
  const slugs = new Set();
  for (const line of md.split('\n')) {
    const m = /^#{1,6}\s+(.+?)\s*#*$/.exec(line);
    if (m) slugs.add(slugify(m[1]));
  }
  return slugs;
}

/**
 * Check every link in every tracked markdown file. Returns an array of
 * `{ file, line, text, target, reason }` for each one that doesn't resolve.
 */
export function checkLinks(root = ROOT, files = trackedMarkdownFiles(root)) {
  const dead = [];
  const cache = new Map(); // absolute file path -> heading slug set, memoized

  const slugsFor = (absPath) => {
    if (cache.has(absPath)) return cache.get(absPath);
    let slugs = new Set();
    if (existsSync(absPath)) {
      try {
        slugs = headingSlugs(readFileSync(absPath, 'utf8'));
      } catch {
        slugs = new Set();
      }
    }
    cache.set(absPath, slugs);
    return slugs;
  };

  for (const relFile of files) {
    const absFile = join(root, relFile);
    if (!existsSync(absFile)) continue; // deleted in the working tree but still tracked at HEAD
    const md = readFileSync(absFile, 'utf8');
    const lines = md.split('\n');

    lines.forEach((lineText, i) => {
      LINK_RE.lastIndex = 0;
      let m;
      while ((m = LINK_RE.exec(lineText))) {
        const target = m[1].trim();
        if (!target || isExternal(target) || isPureAnchor(target)) continue;

        const [filePart, anchorPart] = target.split('#');
        const targetAbs = filePart
          ? resolve(dirname(absFile), filePart)
          : absFile; // `file.md` absent, `#anchor` present -> same file, handled by isPureAnchor above unless there IS a filePart

        if (filePart && !existsSync(targetAbs)) {
          dead.push({
            file: posix.normalize(relFile),
            line: i + 1,
            text: m[0],
            target,
            reason: 'target file does not exist',
          });
          continue;
        }

        if (anchorPart) {
          const slugs = slugsFor(targetAbs);
          if (!slugs.has(anchorPart.toLowerCase())) {
            dead.push({
              file: posix.normalize(relFile),
              line: i + 1,
              text: m[0],
              target,
              reason: `no heading in ${filePart || '(this file)'} slugifies to "#${anchorPart}"`,
            });
          }
        }
      }
    });
  }

  return dead;
}

// ── CLI.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dead = checkLinks(ROOT);
  if (dead.length === 0) {
    console.log(`✅ check:links — every relative link in ${trackedMarkdownFiles(ROOT).length} tracked markdown files resolves`);
    process.exit(0);
  }
  console.error(`❌ ${dead.length} dead link(s):\n`);
  for (const d of dead) {
    console.error(`   ${d.file}:${d.line} — ${d.text} → ${d.reason}`);
  }
  process.exit(1);
}
