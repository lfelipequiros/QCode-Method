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

#### Closed: 05.2 — 2026-08-14

Built directly: `qcode.mjs` at the framework root, `generate` as its first mode. Asks exactly five
static facts (name, slug, owner, remote, git y/n) plus the compass-check toggle — flags, a
`--config` JSON file, or an interactive `readline/promises` prompt when a TTY is present and
`--yes` isn't passed. Every judgment token `generate` can't answer is written as an explicit
`(to define: … — resolve during the qcode-charter pass.)` gap in the house convention, not a
silent guess; a handful (tenancy, the typed-result name, the Claude plan) get a sensible default
instead of a gap, matching what the current interview already offers as a default. Confirmed **no
step asks a judgment question** — the acceptance criterion — by inspecting `gatherAnswers()`
directly: it touches only `name`/`slug`/`owner`/`remote`/`git`/`compassCheck`.

**Verified against real runs, not just unit tests** — five full end-to-end `generate` invocations
against real scratch directories (default happy path, `--config`-driven, `--no-compass-check`,
`--no-git`, and the missing-required-answer error path), each one's output read and checked, not
assumed. That verification found and fixed **three more real bugs**, none in this story's own
file list, all in shared infrastructure other stories will depend on:

1. **`lib/qcode-core.mjs`'s `business-context.md` exclusion was too broad.** 05.1 excluded it from
   the manifest entirely, reasoning "compass-check's own file to fill in, never re-rendered even on
   sync" — true for `sync`, but the blanket exclusion also hid it from `generate`, which has nothing
   to protect yet and needs to render it once like any other file. A `generate --compass-check` run
   silently produced a `compass-check/SKILL.md` that links to a `business-context.md` that was never
   created. Fixed by inverting the mechanism: the file is back in the manifest, but
   `isFrameworkOwned()` now carries one explicit exception marking it `project`-owned — so `sync`
   (which filters to `owner: 'framework'`) still never touches it, and `generate` (no filter) now
   creates it correctly. Caught only because the self-test actually ran `board:check` against the
   real rendered output and it found the resulting dead link.
2. **`check-links.mjs`'s pre-first-commit fallback (02.3, tightened at 05.1) was still one case
   narrower than reality.** It fell back to walking the filesystem when `.git` was entirely absent —
   but `git init` alone leaves a real `.git` directory with `git ls-files` still returning nothing,
   since nothing is staged or committed yet. Trusting that empty answer at face value silently
   checked ZERO files and reported "all resolve" regardless of whether real dead links existed — a
   **false pass**, worse than erroring, because it fails quiet instead of loud. This is exactly the
   state every `generate --git` run leaves a project in. Fixed by changing the condition from "does
   `.git` exist" to "does `git ls-files` return anything at all" — falls back to walking either way.
   Locked in with two new tests: one proving the git-exists-but-nothing-committed case still finds a
   real file via the walk, one proving a genuinely git-tracked file still excludes an untracked
   sibling once real history exists.
3. **`check-links.mjs`'s inline-code stripping (05.1) didn't understand CommonMark's own
   double-backtick escape.** 05.1's own closure prose used `` `` [`skill-name`](../path) `` `` — the
   standard way to show literal backticks inside a code span — and it registered as a dead link on
   this repo's own real, committed tree: stripping single-backtick spans first misparses the
   double-backtick delimiter's own opening pair as one empty single span, leaving a fragment that
   looks like a real link. Found by re-running `check-links` against this repo's own tracked files
   as a regression check, not by guessing. Fixed by stripping double-backtick spans first (which may
   legitimately contain single backticks), then single-backtick spans — verified empirically before
   applying, and locked in with two tests: one proving the illustrative example is ignored, one
   proving a genuinely dead link sitting on the *same line* as such an example is still caught.

**A known, temporary, already-tracked gap remains and is expected.** Every real `generate` run
today fails its own self-test on exactly one thing: `tech-planning/SKILL.md`'s link to
`skills-lock.json`, which doesn't exist as a template until 06.2 ships it (tracked since 03.1's
closure). This isn't a 05.2 defect — verified by stubbing a minimal `skills-lock.json` after each
test run and confirming `board:check` and the cockpit both then pass with zero further issues. It
becomes a real, unconditional pass the moment 06.2 lands — which is exactly what that story's own
"day-one acceptance test" acceptance criterion will prove.

**One spec adjustment.** The story's own text mentioned "generates story index rows via the ported
`index-backlog` logic" as part of this increment — but `generate` explicitly asks no roadmap
question, so there's no new epic/story being created at generate time for `index-backlog` to index;
Foundation's five stories are already static content baked into the `epic-01-foundation/` template
from 02.1. `index-backlog` stays exactly where it already lives — invoked by `tech-planning`
(03.1) and `product-check` when a *later* story gets created. Noted here rather than silently
dropped.

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

#### Closed: 05.3 — 2026-08-14

Built `qcode-charter/SKILL.md` — the interview skill, grouped into nine steps (confirm `generate`'s
silent defaults, goal, value model, stack, architecture + the seam invariants, house standards,
product consumers, roadmap, `business-context.md`), an "Applying the answers" section distinguishing
direct-edit gap resolution from the roadmap's own file-edit path (adding real epic rows, not
substituting a token — `generate` already resolved `EPIC_TABLE`/`EPIC_TABLE_ROADMAP` to nothing in
the Foundation-only case), a named "Resolve the seam gap" step (one answer applied identically across
`tech-planning`/`tech-build`/`tech-qa`, found by grep rather than trusted to memory), and a "Deferring"
section making a named trigger mandatory for any gap left open on purpose. Rewrote
`qcode-project-scaffolder/SKILL.md` from a 219-line interview-and-generate procedure into a slim
five-step orchestrator (gather statics → run `qcode.mjs generate` → report → hand off to
`qcode-charter` → mention `sync`/`migrate` for later) — everything mechanical moved to 05.2's script,
everything judgment-based moved to this story's skill. Updated `references/filling-the-gaps.md`'s
token table to a fourth "Resolved by" column distinguishing `generate` from `qcode-charter`, added
the previously-missing `{{CLAUDE_PLAN}}` row, and updated the gap checklist and gates note to credit
`qcode-charter` as the actual resolution mechanism.

**One judgment call, corrected mid-story.** `qcode-charter` first went into the framework's own
`.claude/skills/`, reasoning "it's a tool I run against other projects, like the scaffolder is." That's
wrong: `qcode-project-scaffolder` orchestrates *from* a QCode-Method clone, but `qcode-charter` has to
run **inside the new project**, on its own turf, after the scaffold exists — so it has to ship *to*
that project the same way every other skill does: as a template `generate` renders. Moved it to
`assets/templates/skills/qcode-charter/` before writing any content, so this shows up as a placement
decision, not a placement bug.

**Verified against a real `generate` run, not just the unit suite.** `node --test lib/qcode-core.test.mjs`
first came back 39/40 — the acceptance-criterion test rendering the real `assets/templates/` tree
reported `qcode-charter/SKILL.md` in `skippedMissingTokens`. Root cause: that file lives *inside* the
template tree, so `generate`'s own token substitution runs over it exactly like any other template —
and its interview prose had been written using literal `{{ONE_LINER}}`-style syntax to talk *about*
which field to resolve, not to *contain* the resolved value. `TOKEN_RE` (`lib/qcode-core.mjs`) matches
any `{{WORD}}` regardless of surrounding backticks, so every one of those 18 documentation mentions was
a live substitution site: the 17 with a real key (`ONE_LINER`, `STACK_HOSTING`, etc.) would have
silently spliced the *answer* into what should have stayed a *field-name reference* — "The goal.
`{{ONE_LINER}}` (one sentence)" rendering as "The goal. `(to define: …)` (one sentence)" — and the one
generic mention (`` `{{TOKEN}}` ``, illustrating the placeholder syntax itself, no real key named
`TOKEN`) tripped `skippedMissingTokens` and silently dropped the whole file from every real `generate`
run. Fixed by converting all 18 to bare backticked names (`` `ONE_LINER` ``, no braces) — the
convention point 1 of the interview was already using correctly, just not consistently — plus a small
prose rewrite where the generic case ("these aren't `{{TOKEN}}` placeholders anymore") became "these
aren't unresolved template placeholders anymore" rather than trade one literal-brace problem for
another. Confirmed via three independent checks, not just the re-run test: (1) `node --test
lib/qcode-core.test.mjs` → 40/40; (2) a genuine `node qcode.mjs generate` run against a scratch
directory, then `grep -o '{{[A-Z_]*}}'` against the rendered `qcode-charter/SKILL.md` → zero matches,
and its frontmatter description reads "The AI half of bootstrapping Acme Widgets" (the one occurrence
that *should* substitute, doing so correctly); (3) `board:check` and the cockpit both run for real
against that same scratch directory and pass, apart from one already-known, already-tracked issue
below.

**Confirmed, not just assumed, that the `skills-lock.json` forward reference is unchanged by this
story.** The real `generate` run's self-test still fails on exactly the same known gap 05.2 already
documented (`skills-lock.json` doesn't exist until 06.2) — now with **two** occurrences
(`tech-planning/SKILL.md` and `compass-check/SKILL.md`, the latter from 03.4's "skills-lock.json
audit" addition, predating this story). Verified both predate 05.3 — neither file was touched by this
story — so this is the same tracked-to-06.2 gap, not a new regression; `check:links` against this
repo's own committed tree (excluding the template source, whose relative links are calibrated for
their *rendered* position, not their template-source position) stays at 0 dead links across 16 files.

**Two stale docs fixed on discovery, both direct contradictions of this story's shipped behavior, not
scope creep:** `README.md`'s "Use 1" section still told readers to copy the skill folder manually and
described a single interview covering identity *and* judgment — both categorically wrong now that
`generate` needs no copying and the interview is split in two. Rewrote that section's four steps, the
repository-layout tree (added `qcode.mjs`, `lib/`, `schema/`; corrected the scaffolder's one-line
description), and the lifecycle-gate count (three → four, `product-check` was already live since 04.1
but never reflected here). `docs/updating-projects.md`'s one scaffold-describing bullet got the same
fix; the rest of that doc (the sync mechanism itself) was left untouched — still accurately describing
today's working `scripts/qcode-sync.mjs`, correctly out of scope until `qcode.mjs sync` ships in 05.4.

**Acceptance criteria, checked:** the skill's own instructions confine every `Write`/`Edit` to
`(to define)` gaps, `business-context.md`, and new-epic scaffolding (`PROJECT-STATUS.md` /
`00-roadmap.md` rows, a new `epic-NN/README.md`) — never a file `generate` already fully rendered; this
is a property of the skill's instructions (verified by re-reading them end to end for any
Write/Edit-shaped directive), not something a script can assert, since `qcode-charter` is AI-executed,
not code. The "Deferring" section makes an unexplained, trigger-less `(to define)` gap explicitly a
failure mode, not an allowed outcome. The closing step's `node qcode.mjs check <project-dir>` call is
a forward reference to 05.4, same pattern as the `skills-lock.json` gap above — accurate once that
story ships, not yet runnable today.

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
