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

#### Closed: 02.1–02.4

_Filled in as each story's subagent pass is QA'd and lands._
