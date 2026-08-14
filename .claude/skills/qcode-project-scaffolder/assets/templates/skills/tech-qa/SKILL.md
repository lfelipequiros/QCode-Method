---
name: tech-qa
description: >-
  Quality gate ("done-done" check) for the {{PROJECT_NAME}} project — the QA companion to
  `tech-planning` and `tech-build`. Use this AFTER an increment is built, whenever you need to confirm
  a change is truly finished: it both reviews the code for correctness and architecture compliance AND
  verifies it produces the expected results. Trigger it on "review this / is this done / QA it / check
  my code / did it actually work / test the results / before I merge / before I ship / before I
  commit," or right after finishing a `tech-build` increment. It runs two phases — compliance review
  (leans on the built-in `code-review`, then checks this project's seams, tenancy, house standards,
  story alignment, and that every architectural decision in the diff has a backing ADR) and results
  verification (leans on the built-in `verify` and the house tests, then walks the story's acceptance
  criteria) — as a numbered round. On PASS it closes the story in three places (the board, the closed
  index, the story file) and **merges it itself** — the only gate that does. On FAIL it stops and hands
  back; it never chains into fixing its own finding. Don't mark an increment done, or merge/ship it,
  until this gate passes.
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

Load the approved [`tech-planning`](../tech-planning/SKILL.md) story — its own file at
`backlog/<epic-dir>/<id>.md`, or `backlog/08-adhoc/<id>.md`. Its **acceptance criteria**,
**increment**, **path-to-target**, and linked [`TECH-DEBT.md`](../../../TECH-DEBT.md) entries are the
spec you're checking against. No story? The work skipped the gates — flag it and route back through
`tech-planning`, because you have nothing objective to verify against.

## Phase 1 — Compliance review (is the code right?)

> **Run this gate in a fresh context.** QA is the *independent* pass — independence is cheaper and
> more honest from a clean session: load the story + the PR diff, not the build transcript.
> Run the built-in `code-review` at **medium** effort for routine increments (high/xhigh only for
> high-stakes or architecture-heavy diffs); `verify` only when the diff has a runtime surface;
> `security-review` only for auth/secrets/webhooks/payments diffs (as already scoped below).

A static pass over the diff. Use the engine, then add the layer it doesn't know:

1. **Run the built-in `code-review`** for correctness bugs and reuse/simplification/efficiency
   cleanups. Don't reimplement general bug-hunting. (It reads the git diff, so the repo must be under
   git.)
2. **Then check this project's invariants** `code-review` has no knowledge of (full detail in
   [`CLAUDE.md`](../../../CLAUDE.md) §6 and the [`architecture/`](../../../architecture/) ASD):
   - **Seams stay sealed** — *(to define: the project's seam invariants, from `architecture/`. E.g.
     "consumers read only through {{ACCESS_LAYER}}, never raw tables.")*
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
5. **Reconcile decisions** — symmetric to debt, for the *decision* lane: every new architectural
   choice or deviation from a checklist item visible in the diff has a backing **ADR** in
   `architecture/01`, and the story's **Decisions raised** cites it. An architectural decision baked
   into code with no ADR is a review **failure**, not a detail — route it back through
   [`tech-planning`](../tech-planning/SKILL.md)'s ADR bridge.

## Phase 2 — Results verification (does it do what it should?)

A dynamic pass — the part that's easy to skip and most often where "I'm sure it works" is wrong:

1. **Run the house checks** — the project's typecheck, lint, and tests.
2. **Run the built-in `verify`** to actually exercise the change and observe real behavior where it
   matters — not only unit tests, but the thing doing the thing.
3. **Then walk the story's acceptance criteria one by one** and confirm each is met by *observed*
   behavior, not assumption. A criterion you can't demonstrate is not met.

## The verdict

Every run of this gate is a numbered **round**. State the round in the verdict (`round 1 — PASS`,
`round 2 — FAIL`) — a story's QA history is what tells a later reader whether an open branch was
*never gated* or *gated and not yet re-gated*. Close with a clear, honest done-done verdict — never a
hopeful one:

- **PASS** — every acceptance criterion met, invariants hold, checks green, debt logged, and every
  architectural decision captured as an ADR the story cites (Phase 1 step 5). Closing a story writes
  to **three places, each holding exactly one kind of thing**:
  1. **[`PROJECT-STATUS.md`](../../../PROJECT-STATUS.md) — delete the *Active increments* row.**
     Don't set it to `done` and leave it; the board holds **open work only**, so a closed story leaves
     it entirely.
  2. **[`backlog/CLOSED.md`](../../../backlog/CLOSED.md) — append ONE row:** `id | date | PR | link`.
     **One id per row** — never pack two ids into one, because a reader that takes the first id on a
     line as *the* id for that row would silently render the second as never-shipped. **`done`
     requires a merged PR** as its evidence; a story with no PR is not done (a no-code / research
     story never runs this gate — it still earns its `CLOSED.md` row, PR-less, when its work is
     confirmed complete).
  3. **The story's own file — the verdict narrative**, under a `#### Closed: <id> — <date>` block.
     Rounds, evidence, what the gate caught, what was carried forward: all of it goes **here**, not on
     the board and not in the `CLOSED.md` row. The index says *that* it shipped; the story says *what
     happened*.

  **Advance the epic row in the same edit:** on the epic's **first** `done` story flip it
  `planned → in-progress`; on its **last**, `→ done`. The cockpit inherits an *unlogged* story's
  colour from its epic, so a stale epic status silently mis-colours every story under it — an epic is
  `done` only when it has **no open stories**; `board:check` rule 8 refuses the combination.

  This update **is** marking it done, and it belongs in the same commit as the work. Then run
  `board:check` (it must exit 0) before you merge.
- **FAIL** — list exactly what's missing (which criterion, invariant, or test), and name where it
  belongs: a code/results gap goes back to `tech-build`, a scope or design gap goes back to
  `tech-planning`. **Say this and stop — don't invoke `tech-build` or `tech-planning` yourself.**
  `tech-qa` is the independent pass *because* the builder doesn't also grade their own fix;
  self-chaining into the next gate collapses that independence. Leave the board honest
  (`in-progress`/`in-qa`, never `done`). A half-passed gate is a FAIL — report failing tests with
  their output and unmet criteria plainly rather than softening them.

## After the verdict — the gate is not done until the work moves

A verdict is not an outcome. This section exists because a gate that ends in a *report* leaves the
branch exactly where it was, and a PR nobody merges is indistinguishable from a PR nobody trusts.

**On a PASS — complete the merge. This gate is the only one that merges** (the delivery contract this
executes is stated once, at [`CLAUDE.md`](../../../CLAUDE.md) §7.2). Do not stop at "safe to
merge": on a PASS you merge to `main`, sync `main`, and delete the merged branch — yourself, in the
same session, without offering a menu. The only things that stop you are a `tech-qa` **FAIL** (never
merge a failed gate) or the user explicitly overriding for that PR. If the working tree holds
unrelated in-flight changes, stash them, commit the gate's board/story update alone, and restore them
after — the QA commit must not carry someone else's half-finished work.

The branch you're merging is the story's **single** branch, carrying `tech-planning`'s plan commit
*and* `tech-build`'s code commits under the one PR `tech-build` opened — so this merge lands the whole
story, plan and code, at once.

**On a FAIL — stop and hand off; do not run `tech-build` yourself.** A FAIL verdict ends this gate's
turn. Report the verdict and say plainly that a `tech-build` pass is needed before this can re-gate —
then **stop**. Don't chain straight into building the fix in the same breath as failing the gate:
that's the builder grading their own homework, the exact thing this gate exists to not be. The fix is
a separate, later invocation of `tech-build`, on the user's go — never `tech-qa`'s own next move.

**A FAIL is closed only by a later recorded PASS, never by the fix itself.** Once a fix does land (via
a fresh `tech-build` invocation), pushing it does not discharge the gate — it only makes the next
round runnable. Say plainly that round N+1 is required before merge, and when that round runs,
**re-enter at Phase 1** — not at the failing check alone, because a fix can break something the
earlier phases already cleared.

**Re-entering for round N+1**, verify the fix **at the mechanism, not at the diff.** A round-1 FAIL is
evidence that reading this code at the line level already missed something once. Re-derive the whole
behaviour the bug lived in (the full state machine, every transition, every ordering) — a five-line
diff that *looks* right is exactly how the same class of bug survives a second pass. Then walk the
criteria again from the top; a re-gate that only re-checks the one broken criterion is not a gate.

**Round hygiene between rounds — a stalled branch must be legible, on the story.** Whenever a round
ends without a merge, *which round ran, what its verdict was, and what is owed next* must be written
down — because "awaiting the nod to run `tech-qa`" is only true before round 1 and becomes a lie the
moment a round has run. Anyone must be able to tell a never-gated PR from a fixed-but-not-re-gated one
**without reading the git log**.

It goes on **the story's own file**, as a `#### QA round N — <date>: <verdict>` block, exactly where
the PASS narrative goes. **Not in the board's Status cell** — that cell holds the bare token
(`in-qa`) and nothing else, and `board:check` rules 3 and 4 reject anything longer. The board says
*that* the story is in QA; the story says *what happened in it*.

## When to skip

Same spirit as the other gates: pure docs, an explicitly-labeled throwaway spike, and trivial
reversible config don't need this. Everything that is real, shipping code does.

## Why one gate, two phases

"Right" and "works" are asked at the same moment, about the same increment, against the same story — so
they're two phases of one done-done check, not two competing skills. Keeping them together keeps the
trigger unambiguous and the context loaded once. The day a dedicated QA role or external-PR review
gives review and verification genuinely *different* moments, revisit splitting them — until then, one
gate is simpler and truer to how a small team actually finishes work.
