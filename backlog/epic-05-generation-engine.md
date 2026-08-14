# Epic 05 — The generation engine

**Goal.** Replace the 100%-AI scaffolder with a script-first engine: a deterministic renderer core
shared by four modes (`generate` / `sync` / `migrate` / `check`), a CLI that handles static facts,
and a new AI skill (`qcode-charter`) that handles only the judgment a script can't make.

**Value archetype.** Enabler — this is what makes every other epic *repeatable and verifiable*
instead of hand-copied. Built last on purpose: it renders the templates epics 02–04 define, so
there has to be a stable target before there's a renderer for it.

**Depends on.** Epic 02 (renders its board/backlog shape), conceptually also 03 and 04 (renders
their skill templates) — though the renderer core itself (05.1) only needs 02's template *paths*
to exist, not their final content, so it can start once 02 lands.

**Reference.** The extraction plan, theme T9 (migration craft); section 06 (the generation
engine); the three-beginnings naming decision (Scaffold → Charter → Foundation).

---

## Stories

### 05.1 — The unified renderer core

**What & why.** `generate`, `sync` (today's `qcode-sync.mjs`), and the new `migrate` mode all
render the same templates against the same tokens. Today that's zero shared code; unifying removes
a bug class where three implementations drift on how a token is substituted.

**This increment.**
- One `qcode.mjs` exposing a shared **template resolver**, **token substitution pass**, **diff
  engine**, **backup mechanism**, and **`customized[]` protection list** (files a project has
  enriched beyond the generic base — review-only, never auto-overwritten without `--force`,
  exactly as today's `qcode-sync` already does for Finosonido).
- **Config schema + `configVersion`** in `.qcode/config.json`, so `migrate` (05.4) can reason about
  which shape a given project was generated from.
- **The substitution pass deletes a whole line when its only content resolves to empty**, rather
  than leaving a blank line — found live at 02.2 QA: `{{EPIC_TABLE}}` and
  `{{EPIC_TABLE_ROADMAP}}` each sit alone on their own line inside a markdown table, and a naive
  find-replace leaves a blank line there once substituted, which silently ends the table early
  (`board-check`'s row reader stops at the first non-`|` line — hiding every row below, including
  the ad-hoc bucket's own row, from every rule that reads that table). Until this story ships,
  `SKILL.md`'s interview step 9 carries the equivalent instruction for whoever substitutes by hand.
- **`package.json` merge strategy** — since it's project-owned but v2 needs `board:check` /
  `check:links` / `cockpit` script entries in it, the renderer adds missing script keys without
  ever overwriting a project's existing ones.
- Idempotency as a first-class property, proven by a test: rendering the same config twice
  produces byte-identical output.

**Acceptance criteria.**
- `qcode.mjs` exports the resolver/substitution/diff/backup functions independently of any mode,
  so 05.2–05.4 import rather than reimplement them.
- A round-trip test (render → render again, same config) produces zero diff.
- The `package.json` merge adds new keys and touches nothing else on a file that already has
  content.
- A token that resolves to empty and sits alone on its own line (`{{EPIC_TABLE}}`,
  `{{EPIC_TABLE_ROADMAP}}`) is removed as a whole line, not replaced with a blank one — proven by
  rendering a Foundation-only project and running `board:check` against the result.

#### Closed: 05.1 — 2026-08-14

Built directly. `lib/qcode-core.mjs` (not `qcode.mjs` at the root — see the judgment call below)
exports `templateToTargetPath`, `isFrameworkOwned`, `resolveManifest`, `substituteTokens`,
`leftoverTokens`, `diffAgainstContent`, `backupFile`, `preserveCockpitLayers`, `isCustomized`,
`mergePackageJson`, `renderPackageJson`, `loadConfig`, `validateConfigShape`, and the `renderProject`
orchestrator — every piece 05.2–05.4 need, none of it duplicated. `schema/config.schema.json` is the
full documented config contract; `validateConfigShape` checks the subset that matters at runtime
without an ajv dependency.

**One structural refinement over the story's own file list.** The spec named `qcode.mjs` as the
core; built it as `lib/qcode-core.mjs` instead, reserving the root `qcode.mjs` for the actual CLI
(`generate`/`sync`/`migrate`/`check` dispatch), which 05.2 starts building. A file named after the
CLI tool with no CLI behavior yet — because no mode exists to dispatch to — read as backwards; the
library/entry-point split avoids that without changing what's exported or how 05.2+ import it.

**35 tests, and this story earned every one of them the hard way — four real bugs found and fixed
during its own end-to-end acceptance test, none of them in scope for what 05.1 originally asked
for:**

1. **`check-links.mjs` (shipped in 02.3) hard-crashed on a pre-first-commit project.** Its
   tracked-files-only design shells out to `git ls-files`, which errors outright — not empty,
   *errors* — when no `.git` directory exists yet. Every freshly `generate`d scaffold is in exactly
   that state until its first commit, so `board:check`'s very first run on a brand-new project would
   have failed on a cryptic git error rather than a real finding. Fixed with a narrow fallback: walk
   the filesystem only when `.git` is entirely absent; the moment a repo exists, tracked-only is the
   rule again, unconditionally. This is not a "no git available" escape hatch — it's specifically
   the bootstrap window 02.3's own design never anticipated because nothing had exercised it yet.
2. **`check-links.mjs` had no fenced-code or inline-code awareness**, so two purely illustrative
   examples inside prose — `handoff/SKILL.md`'s template block showing what a *generated* handoff
   file should contain (correctly using `../PROJECT-STATUS.md`, right for *that* file's own future
   location, wrong read from `SKILL.md`'s), and `tech-planning/SKILL.md`'s inline `` `[<id>](<id>.md)` ``
   showing an index-row shape — both registered as dead links to a checker that can't tell "real
   navigation" from "text shaped like navigation." Fixed by skipping ` ``` ` -fenced regions and
   stripping single-backtick spans before matching — verified the common `` [`skill-name`](../path) ``
   pattern (link text backtick-wrapped, target bare) survives untouched, since only the bracketed
   text portion falls inside the stripped span.
3. **`product-check` (04.1, this build) linked unconditionally to `compass-check`, which is
   optional.** A project that declines compass-check at scaffold time has no
   `compass-check/SKILL.md` at all, so the prose's own "(if installed)" caveat was contradicted by a
   real, clickable link underneath it. Reverted to a backtick-only mention for this one reference —
   the first case in this build of a target that isn't a *temporary* forward reference (like
   `skills-lock.json`, resolved by 06.2) but a *permanent* per-project conditional; those need to
   stay non-links on principle, not just until some later story ships.
4. **Story 03.4's own `### 03.4 — …` heading was simply never written**, a plain authoring slip
   from this file's very first draft that survived three later closure edits untouched because none
   of them touched that exact spot. `PROJECT-STATUS.md`'s own link to `#034--…` had been silently
   dead since the story was drafted — caught only because this story's regression pass re-ran
   `check-links` against this repo's own real tree (a discipline established at 02.3, still paying
   for itself). Fixed by inserting the missing heading, confirmed its slug matches the anchor
   already in use character-for-character.

None of these four were guessed at or waved through — each was reproduced against a real rendered
project or this repo's own tracked files, fixed, and re-verified with the fix in place before
moving to the next.

### 05.2 — `generate` mode — the scaffold

**What & why.** The deterministic half of bootstrapping a new project: a CLI that asks only for
static identity, renders the whole tree, and proves the result is structurally sound before
declaring success.

**This increment.**
- CLI prompts limited to static facts: project name, slug, path, owner, git remote. Also runnable
  non-interactively from a config file or flags, for repeatable runs.
- Renders every template, generates story index rows via the ported `index-backlog` logic,
  installs hooks, sets `core.hooksPath`.
- **Fix C7** — self-tests before reporting success: zero unresolved `{{TOKEN}}`s, `board:check`
  exits 0, `check:links` green, cockpit renders without error.
- Reports the `(to define)` gap count at the end and hands off explicitly to `qcode-charter`
  (05.3) as the next step — the scaffold is deliberately incomplete without it.

**Acceptance criteria.**
- Running `generate` against a scratch directory with only the required static answers produces a
  repo that passes its own self-test.
- No step in this mode asks a judgment question (value model, roadmap, architecture) — those are
  out of scope for this story by design.

### 05.3 — `qcode-charter` skill — the charter

**What & why.** The AI half of bootstrapping, and a clean split from `generate`: this skill copies
no files at all. It interviews for what only judgment can supply, and writes it into the context
files the gates actually read.

**This increment.**
- Interviews for: the goal of the app, the value model and priorities, the roadmap/epics, the
  architecture seams, house standards, and (if `compass-check` is installed)
  `business-context.md`.
- Writes the answers into `CLAUDE.md`, `architecture/`, `backlog/00-roadmap.md`, the seeded
  epic(s), and `business-context.md`.
- Walks every `(to define)` gap left by `generate`: resolve it now, or defer it explicitly with
  the trigger that will settle it later — on the record, not silently skipped.
- Closes by re-running `qcode check` and reporting what, if anything, remains open.
- Retires the generation half of the current `qcode-project-scaffolder` skill — that skill's
  *interview-for-judgment* content moves here; its *file-copying* content is superseded by 05.2.

**Acceptance criteria.**
- The skill never calls `Write`/`Edit` on a file `generate` already fully rendered (only on the
  context files judgment fills in).
- Every `(to define)` gap is either resolved or logged as a deliberate deferral with a trigger by
  the time the skill reports done.
- `qcode check` run at the end shows a lower (ideally zero) open-gap count than at the start.

### 05.4 — `migrate` + `check` modes

**What & why.** `migrate` is what actually delivers the ADR-059 shape into a project that already
exists in the old flat layout — sync alone can't, because the shape change touches project-owned
files sync deliberately never writes. `check` is the standing readiness signal for both new and
migrated projects.

**This increment.**
- **`migrate`** — built on T9's discipline from Mompa's own ten single-use migration scripts:
  split flat epic files into per-story files, generate index rows from structure (never invent
  one), evict done rows to `CLOSED.md`, rewrite every affected link, verify every relocation
  byte-identical by script (`cmp`, not by eye), then run `board:check` as the acceptance test.
  Dry-run by default.
- **`check`** — reports structural validity (do the files exist, do they parse, does
  `board:check` pass) *and* completeness (how many `(to define)` gaps remain open) as two
  distinct signals — an incomplete-but-valid project is not the same as a broken one.
- `MANAGED` (the sync/renderer's framework-owned file list) grows from 8 to roughly 15 entries to
  cover `product-check`, `status-guard.sh`, `board-check.mjs` + its test, `check-links.mjs`,
  `index-backlog.mjs`, and the CI workflow template.
- **QCode-Method migrates itself first.** This repo's own board — deliberately left in the v1
  shape by 01.1 — is `migrate`'s first real run: a rehearsal on a repo fully controlled by the
  person building the tool, before it's ever pointed at Finosonido.

**Acceptance criteria.**
- Running `migrate --dry-run` against QCode-Method's own v1-shaped board reports every file it
  would split/move, with zero deletions in the additive passes (`git diff --numstat` proof).
- Running it for real converts this repo's own backlog to the ADR-059 shape, and
  `npm run board:check` (or the zero-dependency equivalent) exits 0 immediately after.
- `qcode check .` against the migrated result reports "structurally valid."

#### Closed: 05.1–05.4

_Filled in as each story's subagent pass is QA'd and lands._
