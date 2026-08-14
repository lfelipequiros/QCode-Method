# Epic 02 — The shape and its enforcement

**Goal.** Land the ADR-059 information architecture (story-is-a-file, board holds open work only,
closed work is an append-only index) into the scaffolder templates, plus the machine-checked
enforcement that proves the shape stays true — not just that it was written. This is the spine:
every later epic assumes this layout exists.

**Value archetype.** Extraction — Mompa's board hit 555 KB / 1,795 lines and its backlog 1.45 MB
before this shape and its enforcement existed; it is proven under real load, not speculative.

**Depends on.** Epic 01.

**Reference.** The extraction plan, themes T1 (information architecture), T2 (mechanized
enforcement), T8 (cockpit evolution); composition findings C1–C6.

---

## Stories

### 02.1 — Information architecture: the ADR-059 shape

**What & why.** Rewrite the scaffolder's board/backlog templates so every new project starts with
a story-is-a-file backlog, an open-work-only board, and an append-only closed index — the shape
Mompa converged on after its board became unmanageable.

**This increment.**
- `PROJECT-STATUS.md` template: strip *Recently done*; add the open-work-only header note, the
  general index rule (*"a high-level file carries ids, links and a status; the file that carries
  the DETAIL is the individual story or epic file"*), a *Needs status review* section, and the
  extended status vocabulary including `raised`.
- Backlog: flat `epic-01-foundation.md` → `epic-01-foundation/README.md` (Goal + `## Stories`
  index) + one file per story (`01.1.md`…). `08-adhoc.md` → `08-adhoc/README.md`.
- New templates: `backlog/CLOSED.md` (`id · date · PR · link`, append-only), `backlog/ACCEPTED.md`
  (decided-not-planned; cleared only by routing, rows never deleted), an epic `README` template,
  a story-file template.
- **Fix C2** — the ad-hoc bucket ships with status `planned`, not `open bucket` (which is in
  neither the vocabulary nor any alias map and would fail rule 4 on a project's first commit).
- **Fix C4** — repoint every `../../../backlog/08-adhoc.md` link across the skill templates
  (`tech-planning`, `tech-build`, `tech-qa`, `compass-check` all currently hard-link the flat file)
  to the new directory path. `check:links` green is part of this story's own DoD, not a later
  cleanup — it will be re-verified once 02.3 ships the checker, but the links must be correct now.

**Acceptance criteria.**
- No template references a `Recently done` board section or a flat `08-adhoc.md`/`epic-01-foundation.md` path.
- The ad-hoc bucket's shipped status is `planned`.
- `backlog/CLOSED.md` and `backlog/ACCEPTED.md` templates exist with the append-only / routing
  rules stated in their own headers.
- Every `08-adhoc` link across all templates points at the directory form.

### 02.2 — Port `board-check.mjs` + fixture tests

**What & why.** The mechanized half of enforcement: seven rules, each proving something the old
write-proxy guard could only ever assume. Every rule exists because it killed a defect actually
observed in Mompa.

**This increment.**
- Port all seven rules (1, 2, 3, 4, 5, 6, 8) with their inline defect citations intact as
  one-line "why" comments (full incident detail moves to `references/observed-defects.md` per the
  plan's evidence-loss mitigation — not stripped, relocated).
- Parameterize the story-id pattern, file budgets, `MAX_STATUS_CELL`, `MAX_INDEX_ROW` — read from
  `.qcode/config.json` so widening a budget is a deliberate, recorded choice, not drift.
- **Fix C1** — extract the status vocabulary + alias map into a shared `scripts/status-vocab.mjs`
  that this file imports, rather than declaring its own copy (the bug: Mompa's `board-check.mjs`
  has no alias handling while its cockpit does, so an aliased token passes one reader and fails
  the other).
- **Fix C6** — write the fixture-test port against Node's built-in `node:test` + `node:assert`,
  not `vitest`. Preserve the discipline exactly: real pre-refactor fragments quoted verbatim, a
  positive case (fails on the defect) and a negative case (silent on the fix) for every rule —
  *"a rule that cannot fail is not a rule."*
- Extend rule 6's index-row budget to cover a project's product-surface map (closing a gap Mompa
  itself still has — `product/screens-map.md` rows there now run to thousands of characters).

**Acceptance criteria.**
- `node scripts/board-check.mjs` runs with zero dependencies beyond Node itself.
- `node --test scripts/board-check.test.mjs` passes, with at least one positive + one negative
  case per rule.
- `status-vocab.mjs` is the single declaration of the vocabulary; grepping the templates for a
  second `STATUS_VOCAB` array turns up nothing.

### 02.3 — Rebuild the guard as a shared predicate

**What & why.** One predicate, invoked by both the local hook and CI, so local and server-side
enforcement cannot drift apart the way the old write-proxy silently did.

**This increment.**
- `githooks/status-guard.sh`: Rule 0 (NUL-byte / CRLF guard on tracked markdown), Rule 7 (fires on
  a *status event* — code changed, or a story file added/deleted; editing an existing story file
  trips nothing), then invokes `board:check` whenever the changeset touches any tracker surface.
- `githooks/pre-commit` becomes a thin wrapper feeding `git diff --cached --name-status` to the
  shared predicate.
- Port `scripts/check-links.mjs`, scoped to **tracked files only** (`git ls-files`), so the hook
  and CI can never check different file sets.
- Port `scripts/index-backlog.mjs` — index rows derived from a story file's own `###` heading,
  never invented; a file with no parseable heading stops the script rather than guessing.
- Ship a CI workflow template invoking the identical predicate (`ci/board-guard.yml`) — previously
  a manual `(to define)` foundation task in `filling-the-gaps.md`; now shippable outright.

**Acceptance criteria.**
- `pre-commit` contains no rule logic of its own — only the wrapper line.
- `check-links.mjs` walks `git ls-files`, not the filesystem.
- The CI template invokes the same `status-guard.sh` the local hook does (one `diff --name-status`
  call each, same script).

### 02.4 — Cockpit evolution

**What & why.** The cockpit has to agree with `board-check.mjs` about what a status is, and has to
survive being run against a project that has shipped nothing yet.

**This increment.**
- Read `CLOSED.md` for done ids (fatal only on an *absent* file — a missing index is a real
  error); per-story-file glob replaces per-epic-file parsing; render *Needs status review* rows
  red.
- **Fix C1** — import the same `status-vocab.mjs` as `board-check.mjs`.
- **Fix C3** — distinguish *file absent* (fatal) from *file present but zero data rows* (valid: a
  fresh scaffold has shipped nothing). Parse the table's header structure, not a data-row count.
- Preserve the epic-based default view and the `LAYERS`-preservation contract the sync/renderer
  relies on when re-rendering over a project's customized cockpit.

**Acceptance criteria.**
- Running the cockpit against a scaffold with an empty (header-only) `CLOSED.md` produces a valid
  render, not a crash.
- Running it against a `CLOSED.md` with zero bytes / missing entirely still fails loudly.
- `status-vocab.mjs` is imported, not redeclared.

#### Closed: 02.1 — 2026-08-13

Built by subagent, QA'd by the orchestrating session. All four self-checks from the story brief
passed: zero stale flat-path references, all 5 original `01.X` stories preserved 1:1 as their own
files, the status vocabulary present verbatim, full file list matches the story's file-by-file spec.

Two judgment calls resolved directly by the orchestrator rather than sent back for a second pass:
- **`product-check` wording** — the subagent hedged ("an upstream product-intake gate, if the
  project runs one") to avoid assuming a not-yet-built skill. Since product-check ships **core** in
  epic 04 (decided, not optional) and the alias two lines below already names it directly
  (`needs product-check` → `raised`), the hedge read as inconsistent within the same paragraph.
  Reworded to name `product-check` directly, matching the templates' intended final (v2.0.0) shape
  rather than this mid-build transitional state.
- **Stale "Recently done" prose** — found in 5 places, not fully rewritten. `tech-planning` and
  `compass-check` had one-line reading-list mentions with no real behavior attached — fixed
  directly, in scope for this story. `githooks/pre-commit` and `cockpit/generate.mjs` are
  correctly deferred to 02.3/02.4 (functional rewrites, not prose). **`tech-qa`'s PASS section
  was deliberately left untouched** — its "Recently done" mention isn't a stray word, it's
  describing the entire v1 close procedure (move a row from Active to Recently-done), which is
  exactly what 03.3's three-place close (delete from board → append to CLOSED.md → narrate on the
  story file) is chartered to replace in full. Patching it now would mean two different
  half-descriptions of "how to close a story" across two stories; leaving it as a known,
  temporary inconsistency for 03.3 to resolve properly is the more honest state.

Also fixed at QA time: `00-roadmap.md`'s Foundation row had no markdown link at all in the
original (contrary to the file's own stated promise) — the subagent added one rather than
"repointing" something that never existed, which is the more correct read of the intent.

#### Closed: 02.3 — 2026-08-14

**Built directly by the orchestrating session, not a subagent.** The subagent dispatched for this
story hit a monthly spend-limit error before writing any files (confirmed via `git status` — clean
working tree). Rather than retry a call likely to hit the same wall, the story was implemented
directly from the same detailed spec that would have gone to the subagent, then verified the same
way every prior story was: real runs, not just review.

**Real verification performed, not just review:**
- `sh -n` on both `status-guard.sh` and `pre-commit` — clean parse.
- Rule 7 tested with synthetic `name-status` input for both cases that matter: an *existing* story
  file modified with no board change (exit 0 — the fix over the old write-proxy guard) and a *new*
  story file added with no board change (exit 1, with the exact violation message). Both confirmed
  by direct output, not inferred.
- `index-backlog.mjs` tested in both modes against the real templates tree: `--check` correctly
  reports all 5 existing stories indexed; a scratch `01.6.md` story was created, indexed, confirmed
  via `git diff --numstat` to be a pure `1 0` insertion (matching the additive-only contract) with
  the actual diff reviewed, then the scratch file and index row were fully reverted.
- `check-links.mjs` found a real bug in its own first draft: `slugify()` collapsed runs of
  whitespace into a single hyphen, which doesn't match GitHub's actual anchor algorithm — a heading
  with an em-dash (`Foo — Bar`) really anchors as `foo--bar` (double hyphen; the dash is dropped,
  both surrounding spaces survive and each becomes its own hyphen) rather than `foo-bar`. Caught by
  running the checker against this repo's own root (not `assets/templates/` — see below) and seeing
  the hand-authored anchors in 02.1/02.2's own `PROJECT-STATUS.md` reported as dead. Verified the
  fix against the literal heading text before and after; re-ran against the real tree: 0 dead links
  across all 16 tracked files, confirming both the fix and the health of this repo's own board.

**A structural non-issue, documented rather than "fixed."** Running `check-links.mjs` or
`board-check.mjs`'s rule 5 *from inside* `assets/templates/` reports ~47 dead links / a rule-5
failure — every one of them a `../../../PROJECT-STATUS.md`-style path in a gate `SKILL.md`. These
are correct once scaffolded (the path resolves from a real project's `.claude/skills/.../SKILL.md`
to its own root) and are artifacts of reading a template file from its *current* location in this
framework repo rather than its *destination* in a scaffolded one — the same reason Mompa's own
`check-links.mjs` explicitly excludes its embedded scaffolder templates from its own scan. No
template content was changed to chase this: real end-to-end link verification belongs to the
day-one acceptance test (06.2), which scaffolds an actual project and checks *that* tree. Any
future story self-testing `board-check`/`check-links` from within `assets/templates/` should expect
rule 5 to report dead links as a known artifact, not a regression.

**Also closed a gap from 02.2:** its files (`board-check.mjs`, `status-vocab.mjs`,
`board-check.test.mjs`, `OBSERVED-DEFECTS.md`) were never added to `SKILL.md`'s Step 2 generation
table — they'd have been silently skipped by anyone following that table literally. Added now,
alongside this story's own new rows.

#### Closed: 02.2 — 2026-08-13

Built by subagent, independently re-verified by the orchestrating session (re-ran
`node --test scripts/board-check.test.mjs` directly rather than trusting the report: 39/39 pass,
matches exactly). Reviewed `board-check.mjs` and `status-vocab.mjs` in full — clean, all seven
rules faithfully ported with real improvements over the source: config-driven budgets with
no-config-needed defaults, `rule5`'s graceful skip when `check-links.mjs` doesn't exist yet
(02.3), and `rule2`'s CLOSED-row link check stripping `#anchor`s before the existence test (avoids
a false violation the source platform's own version doesn't guard against).

**A real cross-story bug was found and fixed.** Self-testing `board-check.mjs` against the
templates' own `PROJECT-STATUS.md` surfaced a genuine defect in 02.1's work: `{{EPIC_TABLE}}` sits
alone on its own line inside the Epics table, and substituting it with an empty string (the
"Foundation only" default — the common case for a fresh scaffold) leaves a blank line, which ends
the table early and hides every row below it, including the ad-hoc bucket's row, from every rule
that reads that table. Same defect in `00-roadmap.md`'s `{{EPIC_TABLE_ROADMAP}}`. Resolved two
ways: `SKILL.md`'s interview step 9 now explicitly instructs deleting the whole line rather than
leaving it blank (fixes it for today's AI-driven substitution), and epic 05 story 05.1 gained an
acceptance criterion requiring the real renderer to handle this programmatically once it exists —
the durable fix, since it removes the dependency on instruction-following entirely. An inline
HTML-comment safety net was tried and deliberately reverted: it would have needed correct handling
on both the empty and non-empty substitution paths, adding a second thing to get right rather than
removing the one that already existed.
