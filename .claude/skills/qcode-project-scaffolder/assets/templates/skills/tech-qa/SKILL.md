---
name: tech-qa
description: >-
  Quality gate ("done-done" check) for the {{PROJECT_NAME}} project — the QA companion to
  `tech-planning` and `tech-build`. Use this AFTER an increment is built, whenever you need to confirm
  a change is truly finished: it both reviews the code for correctness and architecture compliance AND
  verifies it produces the expected results. Trigger it on "review this / is this done / QA it / check
  my code / did it actually work / test the results / before I merge / before I ship / before I
  commit," or right after finishing a `tech-build` increment. It runs two phases — compliance review
  (leans on the built-in `code-review`, then checks this project's seams, tenancy, house standards, and
  story alignment) and results verification (leans on the built-in `verify` and the house tests, then
  walks the story's acceptance criteria). Don't mark an increment done, or merge/ship it, until this
  gate passes.
---

# Tech QA

The third and final gate: **plan → build → QA.** [`tech-planning`](../tech-planning/SKILL.md) said
what to build, [`tech-build`](../tech-build/SKILL.md) built it; this gate proves it's **done-done**
before it ships. "Done-done" has two halves asked at the same moment about the same increment: **is the
code right?** (correct + architecture-compliant) and **does it produce the expected results?** Two
*phases* of one question, not two skills.

This is deliberately the **independent pass** that `tech-build`'s own self-check cannot be. The builder
just convinced themselves the work is fine; this gate puts the QA hat on and looks with fresh, slightly
adversarial eyes — where the bugs the builder's confidence glossed over actually surface.

## Precondition: know what "done" means

Load the approved [`tech-planning`](../tech-planning/SKILL.md) story — in its epic or in
[`backlog/08-adhoc.md`](../../../backlog/08-adhoc.md). Its **acceptance criteria**, **increment**,
**path-to-target**, and linked [`TECH-DEBT.md`](../../../TECH-DEBT.md) entries are the spec you're
checking against. No story? The work skipped the gates — flag it and route back through
`tech-planning`, because you have nothing objective to verify against.

## Phase 1 — Compliance review (is the code right?)

A static pass over the diff. Use the engine, then add the layer it doesn't know:

1. **Run the built-in `code-review`** for correctness bugs and reuse/simplification/efficiency
   cleanups. Don't reimplement general bug-hunting. (It reads the git diff, so the repo must be under
   git.)
2. **Then check this project's invariants** `code-review` has no knowledge of (full detail in
   [`CLAUDE.md`](../../../CLAUDE.md) §6 and the [`architecture/`](../../../architecture/) ASD):
   - **Seams sealed** — *(to define: the project's seam checks, from `architecture/`.)*
   - **Tenancy** — {{TENANCY}}: the tenant key on every tenant-scoped row/read.
   - **No schema change without the matching {{ACCESS_LAYER}} update** in the same change set.
   - **House standards** — {{HOUSE_STANDARDS}}; `{{TYPED_RESULT_NAME}}`, validation at boundaries,
     strict types.
   - **Story alignment** — the diff implements the approved increment: nothing more (no silent scope
     creep), nothing less.
3. **For security-sensitive changes** (auth, secrets, webhooks, access policies), also run the
   built-in `security-review`.
4. **Reconcile debt** — every shortcut visible in the diff is logged in `TECH-DEBT.md` with a paydown
   trigger. An unlogged shortcut is a review failure, not a detail.

## Phase 2 — Results verification (does it do what it should?)

A dynamic pass — the part that's easy to skip and most often where "I'm sure it works" is wrong:

1. **Run the house checks** — the project's typecheck, lint, and tests.
2. **Run the built-in `verify`** to actually exercise the change and observe real behavior where it
   matters — not only unit tests, but the thing doing the thing.
3. **Then walk the story's acceptance criteria one by one** and confirm each is met by *observed*
   behavior, not assumption. A criterion you can't demonstrate is not met.

## The verdict

Close with a clear, honest done-done verdict — never a hopeful one:

- **PASS** — every acceptance criterion met, invariants hold, checks green, debt logged, and any
  architecture change captured as an ADR (`architecture/01`). Record it on the board
  ([`PROJECT-STATUS.md`](../../../PROJECT-STATUS.md)): set the story to `done` (dated) and move it from
  *Active increments* to *Recently done*. That board update **is** marking it done — in the same commit
  as the work. Then it's safe to merge/ship.
- **FAIL** — list exactly what's missing (which criterion, invariant, or test), and route it: back to
  `tech-build` for a code/results gap, or back to `tech-planning` if the gap is a scope/design problem.
  Leave the board honest (`in-progress`/`in-qa`, never `done`). A half-passed gate is a FAIL — report
  failing tests with output and unmet criteria plainly rather than softening them.

## When to skip

Same spirit as the other gates: pure docs, an explicitly-labeled throwaway spike, and trivial
reversible config don't need this. Everything that is real, shipping code does.

## Why one gate, two phases

"Right" and "works" are asked at the same moment, about the same increment, against the same story — so
they're two phases of one done-done check. Keeping them together keeps the trigger unambiguous and the
context loaded once. The day a dedicated QA role or external-PR review gives review and verification
genuinely *different* moments, revisit splitting them.
