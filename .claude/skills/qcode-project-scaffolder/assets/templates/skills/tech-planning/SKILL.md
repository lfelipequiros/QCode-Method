---
name: tech-planning
description: >-
  Architecture-aligned planning gate for the {{PROJECT_NAME}} project. Use this BEFORE writing or
  modifying ANY application code in this repo — whenever a task involves implementing a feature, an
  endpoint, a database migration, a transform, a package, a view, or any code change. It produces an
  approved backlog story (its own file, in its epic's directory) that ties the work to the
  architecture docs (the ASD + ADRs + the project's seams), names its value archetype, defines the
  end-goal target state, the pragmatic increment to build now, and the explicit path from one to the
  other. Every finding the architecture checklist surfaces routes through exactly one of four lanes —
  consistent (cite it), decision (a new ADR via the bridge below), debt (TECH-DEBT.md with a paydown
  trigger), or blocked (OPEN-QUESTIONS.md) — and on approval it opens the story's one branch and
  pushes the plan commit, ready for `tech-build`. Trigger this even when the user just says "let's
  build / add / implement / wire up / code X" without mentioning planning. Do not write code in this
  repo until this gate has produced a plan the user has explicitly approved.
---

# Plan Gate

This repo is **spec-first**: an Architecture Specification ([`architecture/`](../../../architecture/))
and a sequenced backlog ([`backlog/`](../../../backlog/)) say *what is correct* and *what we build
next*. The failure mode this skill prevents is code that drifts from that spec — an increment that
solves today's task but quietly walks away from the end goal, so "temporary" becomes permanent and the
seams rot.

The job of this gate is small and strict: **before any code, turn the task into an approved backlog
story that knows where it's going.** Pragmatic, not-yet-clean implementations are *welcome* — but only
when the story makes explicit (a) the clean end-goal target, and (b) how this increment is a step
*toward* it. A shortcut you can name and track is fine; a shortcut you hide is the thing we refuse.

## When this applies

Run this gate whenever you're about to **write or modify code anywhere in this repo**. It applies
project-wide — the point is one consistent discipline. **If a new product idea has no backlog story
yet**, [`product-check`](../product-check/SKILL.md) runs first — it shapes the requirement (who it's
for, where it fits, the edge cases) before this gate does the architecture pass. Don't re-derive that
shaping here if a `product-check`-drafted story already did it.

**When to skip it** (don't be precious): pure documentation edits (including the ASD/backlog), a
throwaway exploration the user explicitly labels a spike (but capture what you learned into a story
before building the real thing), and trivial reversible config (a lint rule, a `.gitignore` line). If
you're unsure whether something is "real code," it is — run the gate.

## The process

1. **Load the relevant spec — surgically.** [`CLAUDE.md`](../../../CLAUDE.md) is already in context
   (never re-read it). Open only: the `architecture/` file(s) the task actually touches, the matching
   story's epic (its `README.md` index, not every story in it), and
   [`../../../OPEN-QUESTIONS.md`](../../../OPEN-QUESTIONS.md). For the ADR ledger, **Grep the
   specific ADRs the story touches** (by seam/topic) instead of reading
   [`architecture/01-principles-and-decisions.md`](../../../architecture/01-principles-and-decisions.md)
   wholesale — cite what you actually loaded. From [`PROJECT-STATUS.md`](../../../PROJECT-STATUS.md)
   read only the epic table + *Active increments* — that's the whole board now; shipped work lives in
   [`backlog/CLOSED.md`](../../../backlog/CLOSED.md) and isn't relevant to planning what's next.
2. **Place the work. A story is a FILE**, never a section appended to a bigger one:
   - If it advances an existing epic, **create `backlog/<epic-dir>/<id>.md`** (e.g.
     `backlog/epic-03-canonical-model/03.4.md`), starting with its `### <id> — Title` heading, and
     **add one row to that directory's `README.md` `## Stories` index**
     (`| [<id>](<id>.md) | Title |`) — `index-backlog.mjs` can do this for you:
     `node scripts/index-backlog.mjs --file backlog/<epic-dir>/<id>.md`.
   - If it fits no existing epic, create **`backlog/08-adhoc/<id>.md`** the same way, indexed in
     [`backlog/08-adhoc/README.md`](../../../backlog/08-adhoc/README.md). Never invent a parallel
     planning system — these two homes are the only ones.
   - **Never append a story to an epic's `README.md`.** The README holds the epic's Goal, value
     archetype, and story index only — nothing else. Appending story content there is exactly how a
     flat backlog regrows into an unreadable monolith one "just this once" at a time; the whole point
     of the per-story-file shape is that it can't happen by accident.
   - **Register it on the board** — add/confirm the epic in
     [`PROJECT-STATUS.md`](../../../PROJECT-STATUS.md), the *only* place status lives. The story
     itself carries **no status line** (zero duplication) — `board:check` enforces this shape.
3. **Draft the story** using the template below. The target → increment → path section is the heart.
4. **Run the alignment checklist** (below). Each item is a question the architecture already
   answered — walking it surfaces the **findings**: every place this work touches, extends,
   contradicts, or is blocked by the spec.
5. **Route every finding** through the four-lane taxonomy (below). This is where the gate earns its
   keep: nothing floats loose in a story's prose and nothing gets silently coded — each finding lands
   in exactly one lane.
6. **Present for approval and stop.** Show the story (with its decisions and debt) and ask for
   explicit approval. **Write no code until the user approves.** If blocked by an
   `OPEN-QUESTIONS.md` item, say so and propose waiting or a clearly-bounded stopgap.
7. **On approval, deliver the plan** (below) — open the story's branch, commit, push.
8. **Hand off** to [`tech-build`](../tech-build/SKILL.md) to implement *only* the increment, naming
   the branch you just pushed — `tech-build` continues on that same branch. Its acceptance criteria
   are the definition of done. If reality diverges from the plan mid-build, `tech-build`'s divergence
   protocol brings the change back here.

## Delivering the plan — one branch per story

A story gets **exactly one branch**, and this gate opens it. That branch then carries the plan commit
*and* the code commits, so the whole story — why, then what — reviews as a single diff and merges
once, instead of a separate plan PR and code PR for the same piece of work.

**On approval, without asking again:**

1. **Branch off fresh `main`** — `git checkout main && git pull --ff-only`, then
   `git checkout -b feat/<story-id>-<slug>` (e.g. `feat/03.4-canonical-products`). Name it for the
   **code that's coming**, not the plan document — `feat/…` even though the first commit is markdown,
   because `tech-build` builds on this same branch.
2. **Commit atomically** — the story file, its epic README index row, `PROJECT-STATUS.md`, and any
   ADR / `TECH-DEBT.md` / `OPEN-QUESTIONS.md` entry the routing produced, all in **one commit**. The
   status guard requires the board in the same commit as a new story file — an atomic plan commit
   isn't a nicety here, it's the rule.
3. **Push** — `git push -u origin <branch>`. **Do not open a PR.** The PR is `tech-build`'s to open
   once the code is green, so the reviewer sees plan and code as one diff.
4. **Tell the user the branch name** in the hand-off.

**The exception — planning-only work goes straight to `main`.** When no code will follow (a re-plan
or story refresh, a status/doc correction, a standalone ADR), there's no `tech-build` to build on the
branch and no `tech-qa` to merge it — a branch would strand with no owner. Commit it **directly to
`main`** and push: no branch, no PR. If you're unsure whether code will follow, it will — take the
branch.

## The story template

The file is `backlog/<epic-dir>/<id>.md`, and its **first line is the `### <id> — Title` heading** —
that's what the epic README's index row is derived from, so it isn't optional and its id must match
the filename:

```markdown
### <NN.M> — <short title>

**What & why.** <The outcome, in the user's terms.>

**Value archetype.** <one of {{VALUE_ARCHETYPES}} | enabler> — <one line justifying it>.

**Architecture alignment.** <Which ASD files / ADRs / seams this touches, and the confirmation it
obeys them. Cite the docs.>

**Target (end goal).** <Where this should ultimately land when clean — the spec-ideal version.>

**This increment.** <What we actually build now. May be pragmatic / not-yet-clean. Be honest.>

**Path to target.** <How this increment moves toward the target, and what would change to reach the
clean version. If identical, say "increment == target.">

**Decisions raised.** <Link to any ADR(s) created during planning for a *decision*-lane finding, or
"none.">

**Debt incurred.** <Link to TECH-DEBT.md entries for any *debt*-lane shortcut, each with a paydown
trigger, or "none.">

**Open-questions check.** <Any *blocked*-lane OPEN-QUESTIONS.md item this depends on, or "no
blockers.">

**Acceptance criteria.**
- <objective, testable conditions — the definition of done>
```

## Architecture alignment checklist

Confirm each in the story, or route a genuine deviation through the decision lane below:

- **Tenancy** — {{TENANCY}}: every tenant-scoped row/read carries/filters the tenant key; nothing
  assumes a single tenant unless the project is single-tenant.
- **The seams hold** — *(to define: the project's seam invariants — e.g. "sources stay behind the
  connector interface; consumers read only through {{ACCESS_LAYER}}, never raw tables." Fill from
  `architecture/00-overview.md` once the seams are defined.)*
- **No schema change without the matching {{ACCESS_LAYER}} update** in the same change set.
- **House engineering standards** — {{HOUSE_STANDARDS}}; `{{TYPED_RESULT_NAME}}`, validation at
  boundaries, strict types (CLAUDE.md §6).
- **Stage-gated** — don't introduce new infrastructure unless its named trigger fired (architecture
  overview). If you reach for one, say which trigger fired.
- **Plan-consistent** — the work doesn't quietly break an assumption a later, already-planned story
  depends on. A reorder or a broken dependency is itself a finding — route it (usually a *decision*,
  sometimes back to the backlog for re-sequencing).
- **Value lens** — the story names a real archetype, not a hand-wave.

## Routing findings — the four lanes

The canonical decision taxonomy for the whole lifecycle. A **finding** is anything the alignment
checklist surfaces: a place the work touches, extends, contradicts, or is blocked by the spec. Every
finding lands in **exactly one** lane — never floating in a story's prose, never silently coded.
([`tech-build`](../tech-build/SKILL.md) and [`tech-qa`](../tech-qa/SKILL.md) reference these same four
lanes; this is their home.)

1. **Consistent** — the work obeys an existing ADR/ASD rule. *Action:* cite the rule in the story's
   **Architecture alignment**. Nothing new to record.
2. **Decision** — a *new architectural choice* the ADRs don't yet cover, **or** a deviation from a
   checklist item. *Action:* run the **ADR bridge** (below) → a new ADR. Cite it in the story's
   **Decisions raised**. A new architectural choice may not be baked into a story — or later, into
   code — without an ADR; that's the lane's whole point.
3. **Debt** — a pragmatic shortcut *away* from the spec-ideal that you'll pay down later. *Action:*
   add an entry to [`../../../TECH-DEBT.md`](../../../TECH-DEBT.md): what we did instead of the clean
   way, why, the target it deviates from (link the ASD), and the **paydown trigger** — the concrete
   condition that means "now fix it." Untriggered debt is how "temporary" becomes forever. Cite it in
   the story's **Debt incurred**.
4. **Blocked** — the right answer needs information only a person outside the repo can supply (a
   teammate, a vendor). *Action:* record it in
   [`../../../OPEN-QUESTIONS.md`](../../../OPEN-QUESTIONS.md) and cite it in the story's
   **Open-questions check**. Propose either waiting or a clearly-bounded stopgap (the stopgap is
   usually itself a *debt*- or *decision*-lane finding).

The lanes aren't exclusive across a story — one story can raise an ADR *and* log debt *and* depend on
an open question. They're exclusive **per finding**: each thing you noticed has one home.

### The ADR bridge (decision-lane findings)

When a finding is a real architectural decision, don't reason it out ad hoc in the story:

- **If the `architecture` skill is installed** (check [`skills-lock.json`](../../../skills-lock.json)
  or `.claude/skills/architecture/`), use it for the **rigor** — named options, a trade-off analysis
  against {{DECISION_AXES}}, and consequences — then **distill the result into this repo's house ADR
  format** (below), which is terser than the skill's own standalone template. The two formats are
  meant to differ: the vendor skill's is built for a one-off decision write-up, the house format is
  built to be scanned quickly against 50 others in one ledger.
- **If it isn't installed**, do the same rigor inline, without the skill: name the real options
  considered, weigh them against {{DECISION_AXES}}, state the consequences — then write it in the
  house format below. A missing optional skill is never a reason to skip the reasoning, only a reason
  to do it yourself.
- **Append to [`../../../architecture/01-principles-and-decisions.md`](../../../architecture/01-principles-and-decisions.md)**
  under the ADR section — the ledger is append-only and that file is the single home for decisions.
- **Number it sequentially** after the last existing ADR (read the file; the next one is ADR-0NN).
- **Use the house shape:**

  ```markdown
  ### ADR-0NN — <short imperative title>

  **Decision.** <the call, in one or two sentences.>

  **Context.** <the forces; the options weighed and why the losers lost.>

  **Consequence.** <what becomes easier/harder, what will get revisited, any cost accepted. Link the
  ASD file(s) this decision now governs.>
  ```

- A deviation from a checklist item **must** land here as an ADR that explicitly says it
  supersedes/qualifies the rule — that's the only sanctioned way to break one.
- If the decision is genuinely unsettled (needs a person, or real spike data), it's **blocked**, not
  decision — don't manufacture an ADR to look decisive; record the open question instead.

## Why this is shaped the way it is

The template front-loads the *target* on purpose. It's easy to describe what you're about to build;
it's the discipline of naming where it should end up — and the honest gap between the two — that keeps
a small team from accreting drift it can't afford to maintain. Keep the gate light enough that it's
never worth skipping.
