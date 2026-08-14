# Epic 03 — The gates

**Goal.** Carry Mompa's hardened gate behavior — the branch/PR delivery contract, the four-lane
finding taxonomy with its ADR bridge, QA rounds and the three-place close — into the scaffolder's
`tech-planning` / `tech-build` / `tech-qa` templates, and reconcile `compass-check` +
`record-learnings` against the new shape.

**Value archetype.** Extraction + prevent-drift — this is where the old write-proxy guard's
failure mode (proves written, not true) gets replaced across the actual gates that create and
close stories, not just the board that records them.

**Depends on.** Epic 02 (the gates reference the new board/backlog layout directly).

**Reference.** The extraction plan, themes T3 (delivery contract), T4 (four lanes + ADR bridge),
T5 (QA rounds); composition finding C9; reverse-drift items R2, R3.

---

## Stories

### 03.1 — `tech-planning` rewrite

**What & why.** The planning gate gains story-as-file placement, the four-lane finding taxonomy,
the ADR bridge, and the one-branch-per-story delivery contract — while keeping QCode's own
surgical spec-loading step, which Mompa itself now needs back (R3).

**This increment.**
- Placement: create `backlog/<epic-dir>/<id>.md` + its README index row; never append to an epic
  README. The "never append" prohibition is stated explicitly, with the failure mode named (a
  README growing back into a monolith).
- The four-lane taxonomy as the canonical home: **consistent** (cite the rule) / **decision** (ADR
  bridge → new ADR) / **debt** (`TECH-DEBT.md` + paydown trigger) / **blocked**
  (`OPEN-QUESTIONS.md`). Exclusive per finding, not per story.
- The ADR bridge: use the `architecture` skill for rigor when installed, distill to the house
  Decision/Context/Consequence shape. **Fallback when it isn't installed** — do the rigor inline
  (named options, trade-offs against `{{DECISION_AXES}}`, consequences) rather than blocking the
  gate. (Decided: `architecture` stays a vendor skill, declared in `skills-lock.json`, not
  bundled — its differing standalone format is exactly what the bridge exists to reconcile, not a
  defect to fix.)
- The branch contract: `tech-planning` opens `feat/<story-id>-<slug>` off fresh `main` on
  approval, commits story + index row + board + any ADR/debt/question atomically, pushes — no PR
  at plan time. Planning-only work (no code will follow) commits straight to `main` instead — a
  branch with no `tech-build` to run on it would strand with no owner.
- Story template gains **Decisions raised**; the alignment checklist gains **plan-consistent** (a
  finding that the work would break an already-planned dependency, itself routed as a finding).
- **Keep** the surgical spec-loading step: `CLAUDE.md` is already in context, never re-read;
  grep the specific ADRs a story touches rather than reading the ledger wholesale; cite what was
  actually loaded.

**Acceptance criteria.**
- The story template includes `Decisions raised` alongside the existing `Debt incurred` /
  `Open-questions check` fields.
- The branch-opening procedure and the planning-only-to-`main` exception are both stated, with the
  exception's reasoning ("a branch would strand with no owner") included.
- The ADR-bridge fallback path is explicit, not merely implied by "if installed."
- `check:links` (once 02.3 ships) is green against this file.

#### Closed: 03.1 — 2026-08-14

Built directly by the orchestrating session. Self-checked structurally rather than by execution
(this is a documentation/skill file, not runnable code — the verification that matters is internal
consistency, not a test suite):

- Frontmatter parses (exactly 2 `---` delimiters), all `{{TOKEN}}` placeholders preserved correctly
  in their new locations (`{{VALUE_ARCHETYPES}}`, `{{TENANCY}}`, `{{ACCESS_LAYER}}`,
  `{{DECISION_AXES}}`), no leftover unsubstituted artifacts beyond intentional illustrative
  placeholders (`<id>`, `<NN.M>`, `ADR-0NN` — all inside code-fenced examples, not real tokens).
- The old `## Logging tech-debt` section and its step-5 "log any debt" framing are fully replaced
  by the four-lane routing table — grepped to confirm no orphaned duplicate remains.
- All internal links point at paths consistent with the existing `../../../` convention; one NEW
  reference was added (`skills-lock.json`, for the ADR bridge's vendor-skill detection) — that file
  doesn't exist yet (ships in 06.2). This is a forward reference of the same kind 03.4 already
  carries for `product-check`'s routing row: tracked, not a defect, resolved by the time 06.2 lands
  since that story was already going to create the file regardless.

**A scope note, not a defect.** The story's own acceptance criteria say "`check:links` green against
this file" — but every `../../../`-style link in every gate template is a known, already-documented
non-issue when checked from *inside* `assets/templates/` (see 02.3's closure): those paths resolve
correctly once scaffolded, not from their current location in this framework repo. Real link
verification for this file happens at the day-one acceptance test (06.2), which scaffolds an actual
project and checks *that* tree — not here.

#### Closed: 03.2 — 2026-08-14

Built directly. Structurally self-checked: frontmatter parses; all four house tokens preserved
(`{{ACCESS_LAYER}}`, `{{TENANCY}}`, `{{HOUSE_STANDARDS}}`, `{{TYPED_RESULT_NAME}}`); the divergence
protocol carries exactly four bullets (better-than-planned / forced-shortcut / design-decision /
scope-change), confirmed by direct count rather than assumed from the diff; the design-decision
lane correctly cross-references `tech-planning`'s ADR bridge by name, matching the actual section
heading 03.1 wrote rather than a paraphrase of it.

Added one thing beyond the story's literal file list: a one-line pointer to the (not-yet-written)
nested-`CLAUDE.md` precedence section in Step 3, since a multi-app project's build step needs to
know that app's own conventions apply on top of this gate. This is a forward reference to 06.1 (the
same kind 03.1 already carries for `skills-lock.json`) — resolved once that section exists, not a
defect now.

### 03.2 — `tech-build` rewrite

**What & why.** The build gate binds to the story's one branch (never opens a second), auto-delivers
on green without a menu, and gains a fourth divergence lane distinct from a shortcut.

**This increment.**
- Step 1 gains branch binding: `git branch --show-current` must be the story's branch; fetch +
  checkout if not; never build on `main`.
- Step 6 (was: close the loop) gains deliver: on green, commit code + board atomically, push, open
  the story's single PR — without offering a "merge now vs QA vs continue" menu.
- Divergence protocol gains **Design decision** as a fourth kind, explicitly distinct from
  *forced shortcut*: a design decision hands back to `tech-planning`'s ADR bridge and resumes
  against the decided design, rather than being logged as debt.
- Board hygiene: the status cell holds a bare token only; build narrative goes on the story file,
  never the board; split-parent stories get an umbrella row in `CLOSED.md`; `board:check` green is
  required before push.
- Generalize the "app-level rituals still govern" note into a pointer at the nested-`CLAUDE.md`
  precedence rule (landing in 06.1) for multi-app workspaces.

**Acceptance criteria.**
- The four divergence kinds (better-than-planned / forced-shortcut / design-decision / scope-change)
  are each named with their own routing, not folded into three.
- The deliver step states explicitly that it does not ask before pushing/opening the PR.
- `board:check` is named as a precondition to push.

### 03.3 — `tech-qa` rewrite

**What & why.** QA becomes rounds, not a single pass — with a three-place close on PASS and a
discipline on FAIL that keeps the gate genuinely independent of the builder who just finished.

**This increment.**
- Every run is a numbered round (`round 1 — PASS`, `round 2 — FAIL`), stated in the verdict.
- **PASS — three places, one kind of thing each:** delete the board's Active row (never "set
  `done` and leave it"); append one row to `CLOSED.md` (`done` requires a merged PR as evidence);
  write the verdict narrative on the story file under `#### Closed: <id> — <date>`. Advance the
  epic row in the same edit — first `done` story flips the epic to `in-progress`, the last flips
  it to `done`.
- **FAIL discipline:** stop and hand off — never invoke `tech-build` from inside `tech-qa` itself,
  since that collapses the independence the gate exists to provide. A FAIL is closed only by a
  later recorded PASS, never by the fix landing. Re-enter at Phase 1 on the next round, not just
  the failing check — a fix can break something earlier phases already cleared. Verify at the
  mechanism, not the diff. Round hygiene: whenever a round ends without a merge, what ran and
  what's owed is written on the story as a `#### QA round N` block.
- Merge authority: on PASS, `tech-qa` completes the merge itself (merge to `main`, sync, delete
  the branch) — the only gate that merges.
- Phase 1 gains step 5 — reconcile decisions, symmetric to the existing debt-reconciliation step:
  an architectural decision visible in the diff with no backing ADR is a review **failure**.
- **Keep** the fresh-context + effort-tier guidance (medium effort for routine increments,
  `verify` only when there's a runtime surface, `security-review` only for
  auth/secrets/webhooks/payments diffs).

**Acceptance criteria.**
- The PASS path names all three surfaces explicitly, in order, with "index says it shipped, story
  says what happened" as the closing distinction.
- The FAIL path states the no-self-chaining rule and the "closed only by a later PASS" rule as
  separate, explicit sentences — not implied by each other.
- Merge authority is stated as this gate's alone.

#### Closed: 03.3 — 2026-08-14

Built directly. All four acceptance criteria confirmed by direct grep, not assumed from the diff:
the three-place close is fully spelled out (board deletion, one `CLOSED.md` row, story-file
narrative); the FAIL path's no-self-chaining and closed-only-by-a-later-PASS rules are separate
sentences in two different sections (the verdict itself, and "after the verdict"), not folded into
one; merge authority ("this gate is the only one that merges") is stated explicitly.

**Closes a thread left open since 02.3.** That story's closure notes recorded a deliberate,
tracked gap: `tech-qa`'s old PASS description ("move it from Active increments to Recently done")
described full v1 close *behavior*, not a stray word, so a shallow prose patch at 02.1/02.2 time
would have half-implemented what this story does properly. Confirmed by grep: zero remaining
occurrences of "Recently done" in the rewritten file.

**What & why.** `compass-check` needs to read the new closed/accepted indexes and add
`board:check` as the mechanized half of its own reconcile step; `record-learnings` needs its
memory routing corrected to repo-only surfaces, and both need their write boundaries stated
precisely now that `product-check` (epic 04) is about to become a third writer into the backlog.

**This increment.**
- `compass-check` Step 1 reads `CLOSED.md` and `ACCEPTED.md`, adds `npm run board:check` as the
  mechanized half of its reconcile-against-reality step, and audits installed skills against
  `skills-lock.json` in its leverage lens. Keeps QCode's lite/full depth split.
- `record-learnings`: the memory-routing row changes from "the harness memory store" to the repo
  surfaces per the repo-only-memory decision; gains routing rows for the PDR log and surface map
  that epic 04 introduces (as a forward reference — those files don't exist until 04.1 lands, so
  this row stays `(to define)` until then, then gets a follow-up edit). Keeps the cheap-cadence
  guidance (sweep per epic, work from `git log`, not the transcript).
- **Fix C9** — state the write-boundary precedence explicitly: `compass-check` remains read-only
  and routes rather than writes (including never filing a `raised` story itself — that becomes
  `product-check`'s job once it ships); `record-learnings` *proposes* product-surface edits and
  routes them to `product-check` rather than writing them directly.

**Acceptance criteria.**
- `compass-check`'s Step 1 reading list includes `CLOSED.md` and `ACCEPTED.md` by name.
- `record-learnings`'s routing table has no row that still points cross-session facts at the
  harness memory store.
- Both files state, in their own prime-directives section, that they do not write to
  `backlog/`/`product/` — only propose and route.

#### Closed: 03.1–03.4

_Filled in as each story's subagent pass is QA'd and lands._
