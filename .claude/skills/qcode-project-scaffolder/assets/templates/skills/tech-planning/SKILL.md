---
name: tech-planning
description: >-
  Architecture-aligned planning gate for the {{PROJECT_NAME}} project. Use this BEFORE writing or
  modifying ANY application code in this repo — whenever a task involves implementing a feature, an
  endpoint, a database migration, a transform, a package, a view, or any code change. It produces an
  approved backlog story that ties the work to the architecture docs (the ASD + ADRs + the project's
  seams), names its value archetype, defines the end-goal target state, the pragmatic increment to
  build now, and the explicit path from one to the other — logging any shortcut as tracked tech-debt.
  Trigger this even when the user just says "let's build / add / implement / wire up / code X" without
  mentioning planning. Do not write code in this repo until this gate has produced a plan the user has
  explicitly approved.
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
project-wide — the point is one consistent discipline.

**When to skip it** (don't be precious): pure documentation edits (including the ASD/backlog), a
throwaway exploration the user explicitly labels a spike (but capture what you learned into a story
before building the real thing), and trivial reversible config (a lint rule, a `.gitignore` line). If
you're unsure whether something is "real code," it is — run the gate.

## The process

1. **Load the relevant spec.** Start from [`../../../README.md`](../../../README.md) and open the
   architecture files the task touches. Always re-read; the ASD is the source of truth and it changes.
   At minimum skim: the relevant `architecture/` file(s), the matching `backlog/epic-0X` if one
   exists, the root [`CLAUDE.md`](../../../CLAUDE.md) (value model, house standards), and
   [`../../../OPEN-QUESTIONS.md`](../../../OPEN-QUESTIONS.md).
2. **Place the work.** If it advances an existing epic, **append the story to that epic file**. If it
   fits none, append to **[`backlog/08-adhoc.md`](../../../backlog/08-adhoc.md)**. Never invent a
   parallel planning system. **Register it on the board** — add/confirm the epic in
   [`PROJECT-STATUS.md`](../../../PROJECT-STATUS.md), the *only* place status lives. The story itself
   carries **no status line** (zero duplication).
3. **Draft the story** using the template below. The target → increment → path section is the heart.
4. **Run the alignment checklist** (below). Each item is a question the architecture already answered;
   your story must not contradict it without a new ADR.
5. **Log any debt.** If the increment takes a shortcut, record it in
   [`../../../TECH-DEBT.md`](../../../TECH-DEBT.md) with a paydown trigger, and link it from the story.
6. **Present for approval and stop.** Show the story (and any debt) and ask for explicit approval.
   **Write no code until the user approves.** If blocked by an `OPEN-QUESTIONS.md` item, say so and
   propose waiting or a clearly-bounded stopgap.
7. **After approval**, hand off to [`tech-build`](../tech-build/SKILL.md) to implement *only* the
   increment; its acceptance criteria are the definition of done.

## The story template

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

**Debt incurred.** <Link to TECH-DEBT.md entries for any shortcut, each with a paydown trigger — or
"none.">

**Open-questions check.** <Any OPEN-QUESTIONS.md item this depends on, or "no blockers.">

**Acceptance criteria.**
- <objective, testable conditions — the definition of done>
```

## Architecture alignment checklist

Confirm each in the story, or open a new ADR in
[`architecture/01-principles-and-decisions.md`](../../../architecture/01-principles-and-decisions.md)
if you genuinely need to deviate:

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
- **Value lens** — the story names a real archetype, not a hand-wave.

## Logging tech-debt

A shortcut is allowed when it's the right time-to-market call **and** it's recorded. For each, add an
entry to [`../../../TECH-DEBT.md`](../../../TECH-DEBT.md): what we did instead of the clean way, why,
the target it deviates from (link the ASD), and the **paydown trigger** — the concrete condition that
means "now fix it." Untriggered debt is how "temporary" becomes forever.

## Why this is shaped the way it is

The template front-loads the *target* on purpose. It's easy to describe what you're about to build;
it's the discipline of naming where it should end up — and the honest gap between the two — that keeps
a small team from accreting drift it can't afford to maintain. Keep the gate light enough that it's
never worth skipping.
