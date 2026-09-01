---
name: qcode-charter
description: >-
  The AI half of bootstrapping {{PROJECT_NAME}} — run this on the FIRST interaction with the
  project after `qcode generate` created it (or whenever the team says "run the charter / fill in
  the gaps / resolve the (to define) markers / the scaffold is empty, make it real"). `generate`
  answered only static identity (name, slug, owner); this skill interviews for everything that
  needs judgment — the goal, the value model, the stack, the architecture seams, house standards,
  the roadmap beyond Foundation, and (if installed) compass-check's business-context.md — and
  writes the answers directly into `CLAUDE.md`, `architecture/`, `backlog/`, and the gate
  checklists. It never touches a file `generate` already fully rendered; it only fills the
  `(to define: ...)` gaps `generate` deliberately left. Closes by re-running `qcode check` and
  reporting what, if anything, is still open. Do NOT use this to plan a feature or write
  application code — that's `product-check` → `tech-planning` → `tech-build` → `tech-qa`, once the
  charter is done and there's a real backlog to pull from.
---

# QCode Charter

`qcode generate` produced a repo that is **structurally valid but strategically empty** — every
file exists, `board:check` passes, the cockpit renders, but `CLAUDE.md` says the project's own name
is "(to define...)" and the gates have nothing real to align work against. This skill is what makes
the scaffold **operational**: it interviews for the judgment `generate` couldn't supply, on purpose
(a script can compute a slug; it can't decide what this project is *for*), and writes real answers
into the files the gates actually read.

**This is a one-time, whole-project pass** — not a per-story ritual. Run it once, right after
`generate`, before the first `product-check`/`tech-planning` story. If it's re-run later (the team
adds a new epic to the roadmap, say), it should touch only what's actually changing — don't
re-interview settled answers.

## Prerequisite

Confirm `.qcode/config.json` exists at the project root. No config → this isn't a `generate`d
project; stop and say so rather than guessing at a project's shape. Read it: `tokens` holds every
answer `generate` already has (including its charter-deferred `(to define: ...)` placeholders),
`compassCheck` says whether that skill was installed.

## The interview

Group these, and use the `AskUserQuestion` tool for anything with a small option set. Don't
manufacture ceremony for an answer that's already obvious from the conversation that led here — if
the user already said what this project is for, don't ask again, just confirm and move on.

1. **Confirm what `generate` defaulted, don't just accept it silently.** `TEAM_CONTEXT` (default
   "solo developer") and `CLAUDE_PLAN` (default "Pro") got sensible guesses, not gaps — surface
   them once ("I've got team context as 'solo developer' and Claude plan as 'Pro' — still right?")
   so a wrong default doesn't silently ship.
2. **The goal.** `ONE_LINER` (one sentence) and `DOMAIN_SUMMARY` (a short paragraph — what
   it does, for whom). This is usually already implicit in why the user is here; don't force a
   generic restatement if they've already said it in plain language — just tighten it into the two
   fields.
3. **Value model.** `VALUE_ARCHETYPES` — the 1–3 ways this project creates real value (offer
   the default: "replace/avoid a cost · prevent a loss · enable downstream value"). And
   `DECISION_AXES` — what every tool/stack choice gets judged on (default: "Confidence ·
   Time-to-market · Reliability · ROI").
4. **Stack.** `STACK_HOSTING`, `STACK_FRONTEND`, `STACK_BACKEND`, `STACK_DATA`,
   `STACK_AI` — any "none" is fine, don't force a stack the project doesn't have.
5. **Architecture.** Is there a layered/seam shape? If yes: `ARCHITECTURE_OVERVIEW` (the layers
   + the seams that hold them apart), and the specific seam invariants the gates should hold (see
   "Resolve the seam gap," below — this is the one answer that goes into *three* other files, not
   just `CLAUDE.md`). Multi-tenant? → `TENANCY` = the tenant key name, else "single-tenant"
   (already the default). Typed data-access seam? → `ACCESS_LAYER` or "n/a".
6. **House standards.** `HOUSE_STANDARDS` (default offered: a typed result wrapper, schema
   validation at boundaries, strict types, structured logs, "no schema change without the matching
   data-access update") and `TYPED_RESULT_NAME` (default `Result<T>`, already applied unless
   changed).
7. **Product consumers.** `PRODUCT_CONSUMERS` — who reads/acts on this project's product
   surfaces. If the answer is genuinely "n/a" (a library, a pipeline, an internal CLI with no
   user-facing surface), say so plainly — `product-check` is already installed either way, and it
   reads this to decide whether to run its own interview per idea or route straight to
   `tech-planning`.
8. **Roadmap.** At minimum, Foundation (already there). Ask whether the team already knows epics
   beyond it — for each: number, name, one-line outcome, value archetype, dependency. **This is a
   direct file edit, not a token substitution** (see below) — `generate` already rendered
   `PROJECT-STATUS.md` and `backlog/00-roadmap.md` with the `EPIC_TABLE`/`EPIC_TABLE_ROADMAP` tokens
   resolved (to nothing, in the Foundation-only case), so there's no token left to fill; add real
   rows instead. If the team doesn't know their epics yet, that's fine — leave it at Foundation and
   say the roadmap grows via `product-check`/`tech-planning` as ideas arrive.
9. **`business-context.md`** (only if `compassCheck: true` in the config). Walk its own fields:
   goals, weekly bandwidth, runway/financial posture, deadlines, risk appetite, current top
   priority, known failure modes. This is `compass-check`'s only write-once file — after this pass,
   `compass-check` itself updates it, never this skill again.

## Applying the answers

- **Tokens that are still literal `(to define: ...)` gaps** in `CLAUDE.md` and elsewhere: replace
  the gap text with the real answer via a direct edit — these aren't unresolved template
  placeholders anymore (`generate` already substituted every token; a `(to define)` gap is what it
  substituted a judgment token *into*), so find the gap's literal text and replace it.
- **The roadmap (step 8), if the team named epics:** for each one, add one row to
  `PROJECT-STATUS.md`'s Epics table (`| NN | Name | planned | [epic-NN](backlog/epic-NN-slug/README.md) |`,
  matching Foundation's existing row shape) and one row to `backlog/00-roadmap.md`'s Epic map
  (`| NN | **Name** | Outcome | Value archetype | Depends on |`), then create
  `backlog/epic-NN-slug/README.md` using `epic-01-foundation/README.md`'s own shape (Goal / Value
  archetype / Depends on / Reference / an empty `## Stories` index) — **no story files yet**;
  drafting a story is `tech-planning`'s job, not this skill's. Insert new epic rows **above** the
  `08 | Ad-hoc & improvements` row in both tables — epic 08 is reserved for the ad-hoc bucket, and
  every new epic must be numbered around it.
- **`business-context.md`:** a direct edit, its own fields filled from step 9.

### Resolve the seam gap (one answer, three files)

The project's seam invariants are the one `(to define: ...)` gap that appears **identically** in
three places: `tech-planning`, `tech-build`, and `tech-qa`'s own alignment checklists (each has a
line shaped `**Seams stay sealed** — (to define: the project's seam invariants ...)`). Once step 5
has a real answer, replace **all three** occurrences with the same concrete sentence — grep for
`(to define: the project's seam invariants` across `.claude/skills/` to find every instance before
declaring this done; missing one leaves that gate checking against a gap while its siblings check
against the real rule.

## Deferring, when the team genuinely doesn't know yet

Not every gap resolves today, and that's fine — a **deliberate, named deferral** is not a failure
here, a silent skip is. For anything left open, don't just leave the bare `(to define: ...)` text —
append the reason and the trigger inline, in place, so the gap's own file stays the single record
of it (no separate tracking file, no duplication): `(to define: the tenancy mechanism — deferred
until a second tenant actually onboards; trigger: the first real second-tenant signup.)`. A
deferred gap with no trigger is exactly the "temporary becomes forever" failure mode the rest of
this method exists to prevent — don't reproduce it here at the one moment a fresh project could
avoid it from day one.

## Closing — prove the gap count actually dropped

Run `node qcode.mjs check <project-dir>` (from a QCode-Method clone) and report its open-gap count
against what it was before this pass started. Every gap should now be either resolved or a named
deferral with a trigger — never a bare, unexplained `(to define)`. Tell the team plainly what's
still open and why, then hand off: **`product-check` is ready for the first real idea; run
`tech-planning` directly for Epic 01 (Foundation) work, since Foundation is enabler work, not a
product idea, and skips `product-check` by that skill's own rule.**

## Why this is shaped the way it is

The split from `generate` is deliberate, not incidental: a script can render a template and prove
the result is structurally sound, but it cannot know what this project is *for* — and guessing
would be worse than an honest gap, because a wrong guess looks like a real answer until someone
trusts it. `generate` produces the skeleton; this skill is what makes it operational, and it earns
that by being the ONE place a fresh project gets asked the questions that actually matter before
any code gets written against a hollow answer.
