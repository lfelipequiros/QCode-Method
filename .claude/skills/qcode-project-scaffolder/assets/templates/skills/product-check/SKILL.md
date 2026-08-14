---
name: product-check
description: >-
  Product-director gate for the {{PROJECT_NAME}} project — the upstream companion to `tech-planning`.
  Use whenever someone brings a new product idea, feature, or requirement, to shape and gatekeep it
  before any architecture or build planning: a one-line idea, "we should show X," "add a screen/view
  for Y," "where would this fit." Interviews to sharpen anything vague, checks the backlog for
  duplication or conflict, checks the idea against existing surfaces and past product decisions for
  consistency, works through prioritization and edge cases, pushes back — never hard-blocks — on vague
  or conflicting asks, and creates or updates the right backlog entry: a new epic, a new story on an
  existing epic, or an ad-hoc entry. Stops before architecture alignment or ADRs — `tech-planning`'s
  job next. Also has an audit mode: an explicitly-invoked pass reconciling the backlog against the
  product map for drift. Trigger before `tech-planning` whenever no backlog story yet exists for an
  idea.
---

# Product Check

On a small team, the same person often wears both the product-director hat and the engineering hat.
The [`tech-planning`](../tech-planning/SKILL.md) → [`tech-build`](../tech-build/SKILL.md) →
[`tech-qa`](../tech-qa/SKILL.md) gates exist so the engineering pass never gets skipped under
pressure. This skill is the same discipline one layer up: it makes sure the **product** pass —
does this belong in the product, where, for whom, at what cost to what already exists — happens
deliberately, on every new idea, instead of getting waved through straight into architecture planning.

**Where this sits in the lifecycle:**

```
a new idea
    │
    ▼
product-check (this skill)   — originate, place, prioritize, gatekeep the REQUIREMENT
    │
    ▼
an approved, product-shaped backlog entry
    │
    ▼
tech-planning                — architecture alignment, target/increment/path, ADRs, debt
    │
    ▼
tech-build → tech-qa
```

**vs. [`compass-check`](../compass-check/SKILL.md)** *(if installed — it's optional; see
"Prioritization" below for the fallback when it isn't)*. `compass-check` is read-only and advisory —
it tells the user *what* to work on next across the whole backlog. This skill is the one that
actually *writes* a new requirement into the backlog once it's been shaped. Pull `compass-check` in
for its prioritization lens; don't duplicate its scorecard reasoning here.

**vs. [`tech-planning`](../tech-planning/SKILL.md).** `tech-planning` answers *"how do we build this, architecturally?"* for a
requirement that already has a product shape. This skill answers *"should we build this, for whom, on
which surface, and what does 'done' mean in product terms?"* — the question that has to be answered
**first**. Its output is a story with the architecture fields explicitly left open for `tech-planning`
to fill, not a competing template.

## When this applies

- Any new product ask, any size — from "add a filter to X" to "build a whole new surface." Decide
  yourself, from the interview, whether it's epic-worthy, a slice on an existing epic, or an
  `08-adhoc` entry — don't wait for the requester to specify the size.
- Trigger even when the requester doesn't say "plan this" or "spec this out" — a stated feature idea
  is enough.
- **Skip it** when a product-shaped story already exists in the backlog (this gate already ran, or
  someone wrote one directly) and it just needs engineering — go straight to `tech-planning`.
- **Skip it** for pure bug fixes, tech-debt paydown, or infra/tooling work with no new user-facing
  requirement — those aren't product asks; `tech-planning`/`TECH-DEBT.md` already own them.
- **Skip it entirely** for a project with no user-facing product surface (a library, a pipeline, an
  internal CLI) — if `{{PRODUCT_CONSUMERS}}` resolved to "n/a" at scaffold time, route every idea
  straight to `tech-planning` instead.

## The process

### 1. Capture — interview, don't transcribe

A vague idea ("we should show X on the dashboard") gets sharpened **before** anything is drafted, the
same way `tech-planning`'s alignment checklist surfaces gaps before code is written. Ask what's
missing, in plain product terms — don't manufacture ceremony for an idea that already arrives sharp:

- **Who reads/acts on this?** One of `{{PRODUCT_CONSUMERS}}` — a number or a feature with no owner is
  decoration.
- **What decision does it drive?** If the answer is "just good to know," that's a signal it may not
  earn its own surface at all — check whether an existing surface already serves that purpose before
  proposing a new one.
- **Which surface, or is this new?** Check against
  [`product/screens-map.md`](../../../product/screens-map.md) — every existing surface has a stated
  job; know before drafting whether this extends one or wants to be its own.
- **What's explicitly out of scope?** The thing that is *not* being asked for, stated as clearly as
  what is.

### 2. Check the backlog — never draft a duplicate or a silent conflict

Before proposing anything new, read:

- [`PROJECT-STATUS.md`](../../../PROJECT-STATUS.md)'s epic table and *Active increments* — is this
  already tracked or in flight? Then [`backlog/ACCEPTED.md`](../../../backlog/ACCEPTED.md) (decided,
  not yet planned) and [`backlog/CLOSED.md`](../../../backlog/CLOSED.md) (already shipped) — is this
  already settled or explicitly deferred?
- The relevant epic directories under `backlog/` — each epic's `README.md` Goal + story index, and
  the story files themselves, for the same idea under a different name.
- [`product/screens-map.md`](../../../product/screens-map.md) and
  [`product/decisions.md`](../../../product/decisions.md) — does this touch a surface's stated job,
  or run against a recorded PDR?
- [`OPEN-QUESTIONS.md`](../../../OPEN-QUESTIONS.md) and [`TECH-DEBT.md`](../../../TECH-DEBT.md) — is
  this blocked on something already known, or does it interact with a tracked shortcut?

If you find a close match, **surface it** rather than drafting alongside it — either this *is* that
existing item (just point back to it) or it's genuinely different and the difference needs naming in
the new story so the two don't drift apart silently.

### 3. Surface / UX-consistency check

Read [`product/screens-map.md`](../../../product/screens-map.md) for the surface(s) in play and
[`product/decisions.md`](../../../product/decisions.md) for any PDR the idea touches. Ask: does this
fit the surface's stated job as-is, stretch it, or actively blur two surfaces' jobs together? Does it
reuse existing product vocabulary/metrics, or invent a second definition of something the product
already means something specific by? A requirement that fits cleanly just cites the relevant surface
row / PDR in the story. One that doesn't fit is a finding — raise it before drafting further (see
*Gatekeeping*, below).

### 4. Surface and resolve edge cases

Walk the standard product-edge-case checklist below, live, with whoever's bringing the idea. Resolve
what you can together; for what you can't resolve now, decide whether it's genuinely **blocked**
(needs a teammate, a vendor, or another decision-maker to answer something nobody in the room knows
yet — file it in [`OPEN-QUESTIONS.md`](../../../OPEN-QUESTIONS.md)) or simply **deferred** (a known
scope cut — note it inline in the story as "considered, deferred," for `tech-planning`/`tech-build` to
inherit without re-discovering it).

**The checklist** (plain product language, not engineering — `tech-planning`'s architecture checklist
handles the technical edge cases separately):

- **Empty / zero-data state.** What does this look like with nothing to show?
- **No permission / not entitled.** What does a user without access to this feature see?
- **Partial / in-progress data.** If this shows a live or in-progress period, what does it look like
  before that period is over?
- **Multi-tenant** *(if {{TENANCY}} applies)*. Does this make sense for every tenant yet, or is it
  explicitly scoped to one for now — and if so, is that a deliberate, named scope cut?
- **Reused terms.** Does this reuse a word/metric the product already defines elsewhere? Two surfaces
  quietly meaning different things by the same word is a trust bug, not a style nit.
- **Surface-job fit.** Covered in step 3 — restate the resolution here if it took discussion.
- **Who acts on this.** Restate the decision/owner from step 1 if the interview surfaced a real gap
  here.

### 5. Prioritization

Ask directly for the hard constraints only a human stakeholder holds — deadline, urgency, why now vs.
later. **If `compass-check` is installed**, invoke it to sanity-check the resulting placement against
the wider picture (the debt-first default, the dependency chain, stage-gating) — it already owns that
scorecard; don't re-derive it here. Reconcile any disagreement between the stated urgency and
`compass-check`'s read explicitly, rather than silently picking one. **If it isn't installed**, do the
same reasoning inline: weigh the idea against {{DECISION_AXES}}, check it against any known tech-debt
whose paydown trigger has fired, and check the dependency chain in `backlog/00-roadmap.md` — the
scorecard is a lens, not a tool you can only apply through the skill.

### 6. Decide placement

**A story is a FILE** (the same shape `tech-planning` uses): `backlog/<epic-dir>/<story-id>.md`, plus
one row in that directory's `README.md` story index. Never append a story to a monolith or to an epic
README.

- **Fits an existing epic's stated Goal** → create a new slice file in that epic's directory, e.g.
  `backlog/epic-02-<slug>/02.5.md`, and add its README index row.
- **Doesn't fit any existing epic, but is a real, defined product direction** → propose a new epic as
  a **directory**, numbered next (check the highest existing `epic-NN` first, skipping `08` which is
  reserved for the ad-hoc bucket): `backlog/epic-NN-slug/README.md` from the epic-level template
  below, with each slice its own file.
- **Small, one-off, doesn't warrant its own epic** → create `backlog/08-adhoc/<id>.md` (see
  [the index](../../../backlog/08-adhoc/README.md) for the next free id), matching its existing story
  format.

Never invent a fourth home for the work — these three are the only backlog surfaces, matching
`tech-planning`'s own rule.

### 7. Draft the entry

Use the template below. It deliberately mirrors `tech-planning`'s story shape so the two gates read as
one continuous document, but the architecture-heavy fields are explicit placeholders —
**`tech-planning` fills those in at its own pass, not this one.** Don't guess at architecture
alignment, target/increment/path, or debt here; that's a different kind of judgment call and belongs
to the gate that makes it.

**For a new epic**, the epic-level block (Goal / value archetype / Depends on / Reference /
Surface-UX fit / Prioritization / Edge cases) goes in the new directory's `README.md`, and each slice
is **its own file** (`backlog/epic-NN-slug/<NN.M>.md`) in the shape below, with a row in the README's
story index. **For a slice on an existing epic**, write the slice block as a new
`backlog/<epic-dir>/<NN.M>.md` file and add its index row — never append it to the README.

```markdown
### <NN.M> — <short title>

**What & why.** <the outcome, in the reader's terms — who gets what, and why it matters to them>

**Value archetype.** <one of {{VALUE_ARCHETYPES}} | enabler> — <one line>

**Surface / UX fit.** <which surface(s) this touches, citing product/screens-map.md; which PDR(s) it
honors or that this requirement itself establishes>

**Prioritization.** <the stated urgency/constraints + the compass-check sanity-check note, or the
inline reasoning if compass-check isn't installed>

**Edge cases — resolved.** <bulleted, each with its resolution from step 4>

**Edge cases — deferred.** <bulleted; each tagged either "OPEN-QUESTIONS.md Q-NN" (blocked) or
"considered, deferred — <reason>" (a deliberate scope cut)>

**Architecture alignment.** _Awaiting `tech-planning` pass._

**Target (end goal).** _Awaiting `tech-planning` pass._

**This increment.** _Awaiting `tech-planning` pass._

**Path to target.** _Awaiting `tech-planning` pass._

**Decisions raised.** _Awaiting `tech-planning` pass._

**Debt incurred.** _Awaiting `tech-planning` pass._

**Open-questions check.** <any blocked-lane item already filed in step 4, or "no blockers.">

**Acceptance criteria (product-level).** <plain-language "done" from the user's point of view — not
technical proofs. `tech-planning` adds the technical acceptance criteria alongside these; it doesn't
replace them.>
```

### 8. Update the trackers

- **[`product/screens-map.md`](../../../product/screens-map.md)** — add or update the row for any
  surface this requirement touches or introduces.
- **[`product/decisions.md`](../../../product/decisions.md)** — add a new PDR *only* if this
  requirement makes a genuinely new durable product-level call (a surface-job boundary, a
  naming/vocabulary rule, a UX convention meant to hold going forward). Most requirements just cite an
  existing PDR — don't mint one for every story.
- **[`PROJECT-STATUS.md`](../../../PROJECT-STATUS.md)** — register the new epic/slice on the board as
  `planned` (or `raised` if it's filed but not yet confirmed for the roadmap), mirroring
  `tech-planning`'s own step 2. A backlog entry invisible on the board is exactly the kind of drift
  `board:check` exists to catch — don't reintroduce it from the product side.
- **[`OPEN-QUESTIONS.md`](../../../OPEN-QUESTIONS.md)** — file anything genuinely blocked from step 4.

### 9. Present for approval, then hand off — stop

Show whoever's approving the drafted entry: the placement and why, the prioritization call, and the
resolved vs. deferred edge cases. Ask for explicit approval before it counts as a real backlog entry
— this is the same plan-first discipline the whole lifecycle runs on. On approval, say explicitly that
the story is now ready for [`tech-planning`](../tech-planning/SKILL.md) — **don't run that gate
yourself**, and never write application code from this skill.

## Audit mode — periodic reconciliation (backlog ↔ product map)

The normal flow above runs per-requirement, forward. But `product/screens-map.md` and
`product/decisions.md` are pointers into a backlog that keeps moving — epics gain slices,
`tech-build` divergences change what a surface actually does, findings get routed mid-flight — and
nothing forces the map to keep up. **Audit mode is the reverse check:** not "does this new idea fit,"
but "does everything already recorded still agree with itself." Run it only when explicitly asked for
— it's a periodic sanity sweep, not a step in the normal flow, and not something to run unprompted on
every session.

**Check both directions:**

1. **Backlog → screens-map (nothing shipped or planned is missing from the map).** Walk every epic in
   `backlog/` and `PROJECT-STATUS.md`'s epic table; for each surface/route it ships or plans, confirm
   a row exists in [`screens-map.md`](../../../product/screens-map.md). Flag a shipped surface with no
   row (invisible to the map) and a planned one the map hasn't caught up to yet.
2. **Screens-map → backlog (nothing on the map is stale or orphaned).** For every row in
   `screens-map.md`, confirm its owning epic still exists, still ships that surface, and the row's
   "job to be done" line still matches what the epic *currently* says — epics evolve after
   `tech-build` divergences and `tech-qa` findings, and a map written at draft time can silently drift
   from what actually shipped.
3. **Status drift.** Cross-check each row's Status column against `PROJECT-STATUS.md`'s epic table —
   the board is the single source of truth for status; the map should never disagree with it.
4. **PDR staleness.** For each PDR in [`decisions.md`](../../../product/decisions.md), confirm it's
   still true of the product: has a later epic or slice quietly shipped something that contradicts it
   without citing or formally superseding it? A contradicted PDR needs either a note that it's
   superseded (naming the epic that did it) or a flag that the newer work is itself the drift to fix.
5. **Uncaptured precedent.** Scan recent epics' build-notes/findings for a "decided together"-style
   product call that never became a PDR. Propose new PDRs for anything recurring or precedent-setting
   that isn't captured yet.
6. **Cross-surface consistency.** Look for two surfaces now using the same term or metric differently,
   or two surfaces whose stated jobs have crept into overlapping territory — checked here for **drift
   that already happened** rather than a new request that might cause it.

**Output — a punch list, not a full report.** Lead with the verdict:

- ✅ **In sync** — nothing to fix. Say so plainly; manufacturing findings to look thorough is the
  failure mode this mode exists to avoid, the same principle `compass-check` runs on.
- Or a numbered list of drift items, each: *what's stale* → *where* (file + section/row) →
  *proposed fix*.

**Never auto-fix.** Present the punch list and ask which items to apply. On a yes, make the edits
(screens-map rows, new or superseded PDRs, board corrections) in the same pass — this is a maintenance
action on files this skill already owns, not a new requirement, so once given the go-ahead, just do it
rather than re-running the full 9-step approval flow per item.

## Gatekeeping — push back, never hard-block

The point of a product director's pushback is to make the requirement better before it's committed,
not to stonewall. When something is vague or contradicts an existing surface's job or a recorded PDR:

- **Name the specific gap or conflict** (cite the screens-map row or PDR it collides with) and propose
  a resolution — don't just flag "this seems off."
- **The requester can always override** ("log it as-is anyway"). When they do, keep the raised concern
  visible **inline in the story** rather than dropping it silently, so `tech-planning`/`tech-build`
  inherit the context instead of re-discovering the same tension later.
- **Severity changes how long you push, not whether you eventually yield.** A vague value case, or a
  request that would openly contradict a shipped surface's stated job or a recorded PDR, deserves a
  real back-and-forth before drafting. A single unresolved edge case is usually just a "deferred"
  line, not a standoff.

## Why this is shaped the way it is

`tech-planning` front-loads the architecture *target* so a pragmatic shortcut never hides where it's
headed. This skill front-loads the **product** target the same way — who this is for, what decision it
drives, and how it fits (or deliberately doesn't fit) what already exists — so that by the time
`tech-planning` picks the story up, the architecture pass is answering "how do we build the right
thing," never "wait, should we even be building this."
