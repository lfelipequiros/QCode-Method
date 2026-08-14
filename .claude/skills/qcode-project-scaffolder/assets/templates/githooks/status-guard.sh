#!/bin/sh
# {{PROJECT_NAME}} SDLC guard — the shared predicate. Keep the status board honest.
#
# This script is the SINGLE source of the rule, invoked by BOTH the local `pre-commit`
# hook and the CI workflow (`.github/workflows/board-guard.yml`), so the two can never
# drift apart.
#
# Usage: pipe `git diff --name-status` output on stdin (STATUS<TAB>PATH per line).
#   git diff --cached --name-status --diff-filter=ACMRD ... | sh githooks/status-guard.sh   (local)
#   git diff --name-status --diff-filter=ACMRD base...HEAD | sh githooks/status-guard.sh     (CI)
# Exit 0 = clean; exit 1 = a violation, with the reason.
#
# ─────────────────────────────────────────────────────────────────────────────────────
# WHY THIS IS SHAPED THE WAY IT IS.
#
# The board used to hold full narrative per story, so "a commit that touches backlog/ or
# app code must also touch the board" was a decent proxy for "the board is probably still
# true." Once the board holds ONE STATUS TOKEN per open story (see PROJECT-STATUS.md),
# that proxy breaks: refining a plan, adding build notes, repairing a link — all change
# backlog/ and have zero status impact, and cannot touch the board without re-inflating
# the very surface the new shape emptied. A guard that fires on routine, status-free work
# is a guard people learn to `--no-verify`, and a guard people learn to bypass is already
# dead.
#
# So the proxy is replaced by the real thing. Two changes:
#
#   1. The board requirement now fires on a STATUS EVENT, not on any `backlog/` byte:
#        · source code changed          — code moves a story's status, always has
#        · a story file was ADDED       — a new story must be registered
#        · a story file was DELETED     — a story leaving must be accounted for
#      Editing an EXISTING story file requires nothing. That is the whole difference,
#      and it is why this guard doesn't cry wolf on ordinary planning work.
#
#   2. `board:check` runs on every changeset that touches a tracker surface at all. The
#      old write-proxy guard could only ever prove the board was WRITTEN. This proves it
#      is TRUE — ids resolve, nothing is open and closed at once, statuses are in
#      vocabulary, indexes stay indexes, every link lands. That is a strictly stronger
#      guarantee than the proxy it replaces.

input=$(cat)
[ -z "$input" ] && exit 0

# STATUS<TAB>PATH. For a rename git emits `R100<TAB>old<TAB>new` — take the LAST field as
# the path so a renamed story file is judged at its destination.
changed=$(printf '%s\n' "$input" | awk -F'\t' 'NF{print $NF}')

# ------------------------------------------------------------------------------
# Rule 0 — the trackers stay plain text: no NUL bytes, no CRLF.
#
# A single NUL byte makes git classify a text file as BINARY, which silently turns
# off .gitattributes' `eol=lf` normalization and makes grep refuse to print matches
# from it. CRLF in a repo pinned to LF produces whole-file phantom diffs. Both are
# invisible in a rendered markdown preview and produce thousand-line phantom diffs
# in review — cheap to check here, so the class never gets a chance to surface.
#
# `tr -d` + `cmp` keeps this POSIX — no grep -P, no shell escapes for control chars.
dirty=''
for f in $(printf '%s\n' "$changed" | grep -E '\.md$'); do
  [ -f "$f" ] || continue   # deleted/renamed-away in this changeset
  tr -d '\000' < "$f" | cmp -s - "$f" || dirty="$dirty       - $f (contains a NUL byte)
"
  tr -d '\r'   < "$f" | cmp -s - "$f" || dirty="$dirty       - $f (contains CRLF line endings)
"
done

if [ -n "$dirty" ]; then
  echo "------------------------------------------------------------------"
  echo "  SDLC guard: a tracked markdown file is not plain LF text"
  echo "------------------------------------------------------------------"
  echo "  A NUL byte makes git treat the file as BINARY — .gitattributes'"
  echo "  eol=lf normalization stops applying and grep goes quiet. CRLF in a"
  echo "  repo pinned to LF produces whole-file phantom diffs."
  echo ""
  printf '%s' "$dirty"
  echo ""
  echo "  Fix (from the repo root):"
  echo "       tr -d '\\000\\r' < FILE > FILE.tmp && mv FILE.tmp FILE"
  echo ""
  echo "  Most likely cause: a script wrote this file in text mode on Windows,"
  echo "  or interpreted a backslash escape it should have written literally."
  echo "------------------------------------------------------------------"
  exit 1
fi

# ------------------------------------------------------------------------------
# Rule 7 — the board requirement fires on a STATUS EVENT.
#
# Was the board itself updated? A story closing DELETES its PROJECT-STATUS.md row and
# ADDS a backlog/CLOSED.md row — either file changing counts as a real board update, so
# both are accepted here.
board=$(printf '%s\n' "$changed" | grep -xE 'PROJECT-STATUS\.md|backlog/CLOSED\.md')

# A story file entering or leaving the backlog — the two backlog events that ARE status.
# `A`dded and `D`eleted only; `M`odified is deliberately absent, and that is the whole
# point of rule 7: editing an existing story has no status impact under this shape.
story_event=$(printf '%s\n' "$input" \
  | awk -F'\t' '$1 ~ /^[AD]/ {print $NF}' \
  | grep -E '^backlog/(epic-[^/]+|08-adhoc)/[^/]+\.md$' \
  | grep -vE '/README\.md$')

# Real source code (not tests). The extension list is a sensible generic default —
# override it per-project via `.qcode/config.json`'s `statusGuard.codeExtensions` (an
# array of extensions, no leading dot) if a project's stack needs a different set.
code_ext='ts tsx js jsx mjs sql py go rs'
if [ -f .qcode/config.json ] && command -v node >/dev/null 2>&1; then
  configured=$(node -e "
    try {
      const c = JSON.parse(require('fs').readFileSync('.qcode/config.json', 'utf8'));
      const ext = c.statusGuard && c.statusGuard.codeExtensions;
      if (Array.isArray(ext) && ext.length) process.stdout.write(ext.join(' '));
    } catch {}
  " 2>/dev/null)
  [ -n "$configured" ] && code_ext="$configured"
fi
code_pattern=$(printf '%s' "$code_ext" | tr ' ' '|')

code=$(printf '%s\n' "$changed" \
  | grep -E "\.($code_pattern)\$" \
  | grep -ivE '(^|/)(tests?|__tests__)/|\.(test|spec)\.')

work=$(printf '%s\n%s\n' "$story_event" "$code" | grep -v '^$')

if [ -n "$work" ] && [ -z "$board" ]; then
  echo "------------------------------------------------------------------"
  echo "  SDLC guard: the board was not updated"
  echo "------------------------------------------------------------------"
  echo "  This changeset contains a STATUS EVENT — code changed, or a story"
  echo "  file was added or deleted — but no board update."
  echo ""
  echo "  Fix: update PROJECT-STATUS.md (open work) or backlog/CLOSED.md (a"
  echo "       closed story) in the same change."
  echo ""
  echo "  Files that triggered this:"
  printf '%s\n' "$work" | sed 's/^/       - /'
  echo ""
  echo "  Note: EDITING an existing story file does not trip this guard."
  echo "  The board holds one status token per open story, so a re-plan, a"
  echo "  build note, or a link repair has no status impact at all."
  echo ""
  echo "  Override (rare — only if there is truly no status impact):"
  echo "       git commit --no-verify"
  echo "------------------------------------------------------------------"
  exit 1
fi

# ------------------------------------------------------------------------------
# board:check — prove the board is TRUE, not merely that it was written.
#
# Runs whenever the changeset touches a tracker surface at all. This is the half the
# write-proxy could not do by construction: what actually matters is now verified, not
# assumed.
trackers=$(printf '%s\n' "$changed" | grep -E '^(PROJECT-STATUS\.md|backlog/|architecture/|product/|TECH-DEBT\.md|OPEN-QUESTIONS\.md)')

if [ -n "$trackers" ]; then
  # `command -v node` guards the rare environment with no node on PATH (a docs-only commit
  # from a bare shell); CI always has one, so coverage is never actually lost there.
  if command -v node >/dev/null 2>&1; then
    root=$(cd "$(dirname "$0")/.." && pwd)
    if ! node "$root/scripts/board-check.mjs"; then
      echo "------------------------------------------------------------------"
      echo "  SDLC guard: board:check failed — the board is not true"
      echo "------------------------------------------------------------------"
      echo "  Run \`npm run board:check\` (or \`node scripts/board-check.mjs\`)"
      echo "  and fix what it names."
      echo "------------------------------------------------------------------"
      exit 1
    fi
  fi
fi

exit 0
