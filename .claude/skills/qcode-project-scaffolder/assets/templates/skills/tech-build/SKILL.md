---
name: tech-build
description: >-
  Implementation gate for the {{PROJECT_NAME}} project — the build-time companion to `tech-planning`.
  Use this whenever you are about to WRITE or MODIFY application code in this repo to build something:
  an endpoint, a migration, a transform, a package function, a view, a script, any code change. It
  binds the code to the approved `tech-planning` backlog story (and refuses to start if there isn't
  one), enforces the architecture invariants and house standards while coding, runs a divergence
  protocol when reality departs from the plan (stop, update the story, log debt — never drift
  silently), and closes the loop on the story's acceptance criteria. Trigger this even when the user
  just says "now build it / implement it / write the code / wire it up / let's code X." If no approved
  story exists yet, hand off to `tech-planning` first — don't code without one.
---

# Tech Build

The **build-time half** of the plan→build pair. [`tech-planning`](../tech-planning/SKILL.md) produced
an approved story that knows where it's going — target, increment, path-to-target, acceptance
criteria. This skill makes sure the **code that actually gets written is that story**, and that it
doesn't quietly drift into something else.

The failure mode it prevents: a carefully approved plan that becomes different code in the heat of
implementation — scope that creeps, a shortcut nobody recorded, an invariant forgotten. For a small
team, code that lies about its own intent is expensive: months later someone (probably you) has to
reverse-engineer why the code doesn't match the plan.

## Step 1 — Require an approved story (the binding)

Before writing any code, confirm there is an **approved `tech-planning` story** for this work — in the
matching epic or in [`backlog/08-adhoc.md`](../../../backlog/08-adhoc.md).

- **No story, or an unapproved one?** Stop and hand off to [`tech-planning`](../tech-planning/SKILL.md).
  (A throwaway spike the user explicitly labeled is the only exception, and what you learn still
  becomes a story before the real build.)
- **Story exists?** Re-read it now, in full. Its **This increment**, **Path to target**, **Acceptance
  criteria**, and any linked [`TECH-DEBT.md`](../../../TECH-DEBT.md) entries are your contract.

## Step 2 — Build only the increment

Implement exactly the increment the story approved — no more.

- **Resist scope creep.** Adjacent work worth doing → capture it as a note for a future story; don't
  fold it in. The moment you build something the story doesn't describe, you're writing unreviewed
  code — the thing the gate prevents.
- **Build toward the target, not away from it.** When the increment is a pragmatic step toward a
  cleaner end-state, implement it so the future migration is *easy* — isolate the shortcut behind a
  seam, keep the debt in one place — rather than entrenching it across the codebase.

## Step 3 — Hold the invariants while coding

Checked on paper at plan-time; coding is where they become real. They live in
[`CLAUDE.md`](../../../CLAUDE.md) §6 and the [`architecture/`](../../../architecture/) ASD — follow
them there. The ones most often dropped mid-build:

- **Seams stay sealed** — *(to define: the project's seam invariants, from `architecture/`. E.g.
  "consumers read only through {{ACCESS_LAYER}}, never raw tables.")*
- **Tenancy** — {{TENANCY}}: the tenant key on every tenant-scoped row and read.
- **No schema change without the matching {{ACCESS_LAYER}} update in the same change set** — a
  migration that ships without its access-layer update breaks consumers silently.
- **House standards** — {{HOUSE_STANDARDS}}; `{{TYPED_RESULT_NAME}}` across service boundaries,
  validation at every external boundary, strict types, structured logs.

If the code genuinely can't satisfy one of these, that's not a quiet exception — it's a **divergence**.

## Step 4 — The divergence protocol (the anti-drift core)

Reality will sometimes contradict the plan. When the code wants to depart from the approved story,
**stop coding** and name which kind of divergence this is:

- **Better than planned** (the clean target is now within reach) → update the story to raise the
  increment toward the target, and retire any planned debt that no longer applies. Take the win — just
  record it.
- **Forced shortcut** (clean isn't feasible right now) → update the story's **This increment** and
  **Path to target**, and log the shortcut in [`TECH-DEBT.md`](../../../TECH-DEBT.md) with a concrete
  **paydown trigger**. A shortcut you record is a decision; one you bury is rot.
- **Scope change** (the task is materially bigger or different) → hand back to
  [`tech-planning`](../tech-planning/SKILL.md). It's a new or expanded story that deserves approval.

For anything material, get the change acknowledged before continuing — plan-first still applies.

## Step 5 — Close the loop (definition of done)

- **Acceptance criteria** — walk the story's criteria and confirm each is met. If one can't be, the
  story isn't done; say so plainly.
- **Checks pass** — run the project's typecheck, lint, and tests. Report failures honestly with
  output; don't paper over a red test.
- **Debt and schema are honest** — every shortcut is in `TECH-DEBT.md` with a trigger, and no schema
  change shipped without its {{ACCESS_LAYER}} update.
- **Story status updated** — move it on the board so the next session starts from truth.

This is the *builder's self-check*. For anything beyond the trivial, hand off to
[`tech-qa`](../tech-qa/SKILL.md) for the **independent** done-done pass — fresh eyes catch what your
own confidence won't.

## Keep the board current

Status lives in exactly one place — [`PROJECT-STATUS.md`](../../../PROJECT-STATUS.md) — so move it as
the work moves, in the **same commit** as the code: flip to `in-progress` when you start (a row under
*Active increments*), `in-qa` at hand-off. Don't write status into the story; `done` is `tech-qa`'s
call.

## Why it's shaped this way

The center of gravity is Step 4. Most of what this skill asks, a good CLAUDE.md already encourages. The
genuinely hard, genuinely valuable part is refusing to let the code silently wander from the plan when
the work gets messy. Re-read the story, build that, and when you must deviate, say so out loud and
write it down.
