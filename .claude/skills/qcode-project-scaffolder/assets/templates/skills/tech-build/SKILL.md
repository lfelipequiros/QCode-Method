---
name: tech-build
description: >-
  Implementation gate for the {{PROJECT_NAME}} project — the build-time companion to `tech-planning`.
  Use this whenever you are about to WRITE or MODIFY application code in this repo to build something:
  an endpoint, a migration, a transform, a package function, a view, a script, any code change. It
  binds to the story's one branch (opened by `tech-planning`, never a second one), enforces the
  architecture invariants and house standards while coding, runs a divergence protocol when reality
  departs from the plan across four lanes — better-than-planned, forced shortcut, a design decision
  the ADRs don't cover, or a scope change — and on green auto-delivers: commits, pushes, and opens the
  story's single PR without asking first. Trigger this even when the user just says "now build it /
  implement it / write the code / wire it up / let's code X." If no approved story exists yet, hand
  off to `tech-planning` first — don't code without one.
---

# Tech Build

The **build-time half** of the plan→build pair. [`tech-planning`](../tech-planning/SKILL.md) produced
an approved story that knows where it's going — target, increment, path-to-target, acceptance
criteria — and already opened the story's branch. This skill makes sure the **code that actually gets
written is that story**, and that it doesn't quietly drift into something else.

The failure mode it prevents: a carefully approved plan that becomes different code in the heat of
implementation — scope that creeps, a shortcut nobody recorded, an invariant forgotten. For a small
team, code that lies about its own intent is expensive: months later someone (probably you) has to
reverse-engineer why the code doesn't match the plan.

## Step 1 — Require an approved story, and bind to its branch

Before writing any code, confirm there is an **approved `tech-planning` story** for this work — its
own file at `backlog/<epic-dir>/<id>.md`, or `backlog/08-adhoc/<id>.md`.

- **No story, or an unapproved one?** Stop and hand off to [`tech-planning`](../tech-planning/SKILL.md).
  (A throwaway spike the user explicitly labeled is the only exception, and what you learn still
  becomes a story before the real build.)
- **Story exists?** Re-read it now, in full. Its **This increment**, **Path to target**, **Acceptance
  criteria**, and any linked [`TECH-DEBT.md`](../../../TECH-DEBT.md) entries are your contract.

**Then bind to the story's branch.** A story has **exactly one branch**, and `tech-planning` already
opened it and pushed the plan commit there. You continue on *that* branch — never open a second one
for a story that already has one (a separate plan branch and a separate code branch is two reviews and
two merges for one story; the one-branch contract is what this replaces).

- `git branch --show-current` must be the story's branch. If it isn't, `git fetch origin` and
  `git checkout <branch>` before writing a line of code.
- **No branch exists?** Only if the story predates this rule. Create it from up-to-date `main` now —
  `feat/<story-id>-<slug>` — and say so.
- **Never build on `main`.**

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
- **If this project has more than one app**, that app's own `CLAUDE.md` (see the root file's nested-
  `CLAUDE.md` precedence section) governs its internals and session conventions on top of this gate —
  read it before touching anything under that app's directory.

If the code genuinely can't satisfy one of these, that's not a quiet exception — it's a **divergence**.

## Step 4 — The divergence protocol (the anti-drift core)

Reality will sometimes contradict the plan. When the code wants to depart from the approved story,
**stop coding** and name which kind of divergence this is:

- **Better than planned** (the clean target is now within reach) → update the story to raise the
  increment toward the target, and retire any planned debt that no longer applies. Take the win — just
  record it.
- **Forced shortcut** (clean isn't feasible right now) → the *debt* lane: update the story's **This
  increment** and **Path to target**, and log the shortcut in
  [`TECH-DEBT.md`](../../../TECH-DEBT.md) with a concrete **paydown trigger**. A shortcut you record
  is a decision; one you bury is rot.
- **Design decision** (the right path needs an architectural choice the ADRs don't cover, or must
  deviate from a checklist item) → the *decision* lane. This is **not** the same as a shortcut: it's a
  new architectural call, and it cannot be baked into code silently. Hand back to
  [`tech-planning`](../tech-planning/SKILL.md) to run its ADR bridge, then resume the build against
  the decided design.
- **Scope change** (the task is materially bigger or different than the story) → hand back to
  [`tech-planning`](../tech-planning/SKILL.md). This isn't a build detail; it's a new or expanded
  story that deserves its own approval.

These map to `tech-planning`'s own four lanes — *debt*, *decision*, and (for scope) a new story; a
divergence that turns out to be *consistent* after all is just resumed. For anything material, get the
change acknowledged before continuing — plan-first still applies. The goal isn't paperwork; it's that
a future session reading the story sees what was *actually* built, not what was once imagined.

## Step 5 — Close the loop (definition of done)

- **Acceptance criteria** — walk the story's criteria and confirm each is met. If one can't be, the
  story isn't done; say so plainly.
- **Checks pass** — run the project's typecheck, lint, and tests. Report failures honestly with
  output; don't paper over a red test.
- **Debt and schema are honest** — every shortcut is in `TECH-DEBT.md` with a trigger, and no schema
  change shipped without its {{ACCESS_LAYER}} update.

This step is the *builder's self-check*. For anything beyond the trivial, hand off to
[`tech-qa`](../tech-qa/SKILL.md) for the **independent** done-done pass before the work is actually
merged or shipped — fresh eyes catch what your own confidence won't.

## Step 6 — Deliver: push and open the PR (the story's one PR)

The moment the checks are green, deliver **without asking first** — don't offer a "push now vs QA vs
continue" menu:

- **Commit atomically** onto the story's branch — code + `PROJECT-STATUS.md` + any story/debt update,
  in one commit.
- **Push**, then **open the PR**. This is the story's **single PR**, and it's born here: because the
  branch also carries `tech-planning`'s plan commit, that one diff shows the *why* and the *what*
  together.
- **Then wait for the nod** before [`tech-qa`](../tech-qa/SKILL.md) runs. On a PASS, `tech-qa` — not
  you — merges it.

## Keep the board current

Status lives in exactly one place — [`PROJECT-STATUS.md`](../../../PROJECT-STATUS.md) — so move it as
the work moves, in the **same commit** as the code:

- **When you start**, flip the story to `in-progress` on the board (a row under *Active increments*,
  linked to its story file).
- **At hand-off to `tech-qa`**, set it to `in-qa`.
- **The Status cell holds a TOKEN and nothing else** — a status word, not a token plus a clause, not a
  PR link, not a parenthetical explaining the round. `board:check` rule 3 fails the commit otherwise.
- **The build narrative goes on the STORY FILE, not the board.** What you tried, what the divergence
  protocol caught, what you carried forward — append it to `backlog/<epic-dir>/<id>.md`. Writing prose
  into the board instead is the exact regression the per-story-file shape exists to prevent.
- **If the increment splits into sub-slices** (the divergence protocol's scope-change path), the
  original parent story stops being an independently-tracked story. Once the children land, give the
  parent its own umbrella row in [`backlog/CLOSED.md`](../../../backlog/CLOSED.md) citing the
  children's PRs. Never leave a split parent as a live story with no PR of its own — it renders
  **perpetually unfinished** on the board and the cockpit.
- Don't write status into the story file; the board is the single surface, and `done` is `tech-qa`'s
  call, not yours.
- **Before you push, `board:check` must exit 0** (`node scripts/board-check.mjs`, or
  `npm run board:check` once wired). It's the same predicate the pre-commit hook and CI run, so a
  green local run is the whole story.

## When to skip

Same spirit as `tech-planning`: pure docs, an explicitly-labeled throwaway spike, or trivial
reversible config don't need this. Everything that is real, shipping code does. If you're unsure
whether something counts as "real code," it does — run the gate.

## Why it's shaped this way

The center of gravity is Step 4. Most of what this skill asks — follow the standards, meet the
acceptance criteria — a good `CLAUDE.md` already encourages. The part that's genuinely hard, and
genuinely valuable, is refusing to let the code silently wander from the plan when the work gets
messy. Keep the gate light enough that it's never worth dodging: re-read the story, build that, and
when you must deviate, say so out loud and write it down.
