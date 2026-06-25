---
name: qcode-project-scaffolder
description: >-
  White-label bootstrapper that scaffolds the entire QCode-Method AI-driven-development operating
  system into a NEW project — the same plan→build→qa discipline, status board, trackers, backlog,
  the record-learnings sweep + handoff system, git guard, progress cockpit, and (optionally) the
  compass-check strategic advisor, generalized and tailored by interview. Use this when starting a new
  repo / project and you want the project-management + SDLC scaffolding set up from day one: "scaffold
  a new project, bootstrap the SDLC, set up project management, kickstart an AI-dev project, give me
  the gates/status board/handoffs in this repo, set up the operating system, run QCode." It runs an
  interview (identity, value model, stack, architecture, house standards, roadmap), then generates the
  orientation doc (CLAUDE.md), PROJECT-STATUS board, trackers, backlog, the three lifecycle gates + the
  record-learnings sweep + handoff skill, the pre-commit guard, the cockpit, and the `.qcode/` config
  that makes the project updatable — every reference-platform detail replaced by either an
  interview-filled value or a marked `(to define)` gap with instructions for filling it during project
  foundation. Do NOT use it to plan a feature inside an already-scaffolded project (that's
  tech-planning) — this sets up the framework itself, once, per project. Copy this skill folder into
  the target repo first, then run it there.
---

# QCode Project Scaffolder

A bootstrapper. It takes the **QCode-Method** operating system — plan-first gates, a
single-source-of-truth status board, ROI-justified and stage-gated work, traceable decisions (ADRs),
a knowledge-loop sweep + session continuity (record-learnings + handoffs), a git guard that keeps it
honest, a live progress cockpit, and an optional strategic conscience (compass-check) — and **stamps a
tailored copy of it into a new project.**

The hard-won insight it encodes: a project's *discipline and structure* are reusable; its *domain,
value model, stack, and architecture* are not. So this skill generates the first fully and
**interviews you to fill the second** — and where an answer can't be settled at interview time, it
leaves an explicit **`(to define)` gap with instructions** rather than a silent assumption.

It also writes a small **`.qcode/config.json`** into the new project that records the framework version
and the interview answers, so the project can later **pull framework updates** with `qcode-sync` (see
the QCode-Method `docs/updating-projects.md`).

## How to use it

This skill scaffolds a *new* repo. **Copy this whole folder
(`.claude/skills/qcode-project-scaffolder/`) into the target repo first**, then invoke it there. It
writes into that repo's root and `.claude/skills/`. It is a one-time tool per project — you may delete
it after bootstrapping, or keep it.

> Source of truth: this skill ships inside the **QCode-Method** framework repo
> (`git@github.com:lfelipequiros/QCode-Method.git`). To scaffold a new project, copy the skill folder
> from a current clone of that repo so you get the latest templates.

## Placeholder convention (read `references/filling-the-gaps.md`)

Templates carry two kinds of blanks. Hold this distinction the whole way through:

- **`{{TOKEN}}`** — resolved *now*, from interview answers (e.g. `{{PROJECT_NAME}}`,
  `{{VALUE_ARCHETYPES}}`, `{{STACK_DATA}}`). Substitute every occurrence at generation time.
- **`(to define: <what> — <how/when to fill>)`** — a deliberate gap the interview can't settle (the
  architecture seams, the canonical model, the tenancy key). Leave it **in place, verbatim**, for the
  team to resolve during project foundation (usually Epic 01). It carries its own instruction.

The full token list and the gap checklist live in
[`references/filling-the-gaps.md`](references/filling-the-gaps.md) — read it before generating.

## Step 1 — Interview

Ask these, grouped. Use the `AskUserQuestion` tool for the multiple-choice ones; let the user free-text
the rest. Don't over-ask — offer sensible defaults (shown) and accept them.

1. **Identity** — `{{PROJECT_NAME}}`, `{{PROJECT_SLUG}}` (kebab-case), `{{ONE_LINER}}`, and a short
   `{{DOMAIN_SUMMARY}}` (what it does, for whom).
2. **People** — `{{TEAM_CONTEXT}}` (solo? a small team? who consumes the output?), and `{{OWNER_NAME}}`
   (who holds the wheel — used by compass-check if enabled; default "the owner").
3. **Value model** — `{{VALUE_ARCHETYPES}}`: the 1–3 ways this project creates value (the generalized
   ROI lens). *Default offered:* "replace/avoid a cost · prevent a loss · enable downstream value."
   And `{{DECISION_AXES}}` — *default:* "Confidence · Time-to-market · Reliability · ROI."
4. **Stack** — `{{STACK_HOSTING}}`, `{{STACK_FRONTEND}}`, `{{STACK_BACKEND}}`, `{{STACK_DATA}}`,
   `{{STACK_AI}}` (any "none" is fine).
5. **Architecture** — is there a layered/seam shape? If yes, capture `{{ARCHITECTURE_OVERVIEW}}`
   (the layers + the seams that hold them apart). If it's not settled, leave the architecture seams as
   a `(to define)` gap. Also: multi-tenant? → `{{TENANCY}}` = the tenant key name (e.g. `tenant_id`)
   or "single-tenant."
6. **House standards** — `{{HOUSE_STANDARDS}}`. *Default offered:* a typed result wrapper
   (`{{TYPED_RESULT_NAME}}`, default `Result<T>`), schema validation at boundaries, strict types,
   structured/prefixed logs, "no schema change without the matching data-access update."
7. **Data-access seam** — does the project read data through a typed package? → `{{ACCESS_LAYER}}`
   (e.g. `@{{PROJECT_SLUG}}/data`) or "n/a." If undecided, `(to define)`.
8. **Roadmap** — at least Epic 01 (Foundation). For each epic beyond Foundation capture its number,
   name, one-line outcome, value archetype, and dependency, then render the rows into **both** epic
   tables from the same data: `{{EPIC_TABLE}}` (the board format in `PROJECT-STATUS.md` — `Status /
   Detail` columns) and `{{EPIC_TABLE_ROADMAP}}` (the roadmap format in `backlog/00-roadmap.md` —
   `Outcome / Value archetype / Depends on` columns). *Default:* Foundation only → both tokens render
   to empty (the `(to define)` gap below each table covers epics 02+).
9. **Strategic advisor** — install the optional **`compass-check`** skill (a read-only CTO-conscience
   that sits above the gates and advises on direction)? *(yes/no — default yes.)*
10. **Git** — initialize the repo + install the status-guard hook now? (yes/no)

Echo the resolved values back before generating, so the user can correct them. Resolve `{{TODAY}}`
(ISO date) and `{{FRAMEWORK_VERSION}}` (read from the `VERSION` file in this skill folder) at
generation time.

## Step 2 — Generate

Copy each template from `assets/templates/` to its target path, substituting every `{{TOKEN}}` and
leaving every `(to define: …)` gap in place. Create directories as needed.

| Template (`assets/templates/…`) | Target path (repo root) |
|---|---|
| `CLAUDE.md` | `CLAUDE.md` |
| `README.md` | `README.md` |
| `PROJECT-STATUS.md` | `PROJECT-STATUS.md` |
| `OPEN-QUESTIONS.md` | `OPEN-QUESTIONS.md` |
| `TECH-DEBT.md` | `TECH-DEBT.md` |
| `env.example` | `.env.example` |
| `gitignore` | `.gitignore` |
| `gitattributes` | `.gitattributes` |
| `package.json` | `package.json` |
| `backlog/00-roadmap.md` | `backlog/00-roadmap.md` |
| `backlog/epic-01-foundation.md` | `backlog/epic-01-foundation.md` |
| `backlog/08-adhoc.md` | `backlog/08-adhoc.md` |
| `architecture/00-overview.md` | `architecture/00-overview.md` |
| `architecture/01-principles-and-decisions.md` | `architecture/01-principles-and-decisions.md` |
| `handoffs/README.md` | `handoffs/README.md` |
| `githooks/pre-commit` | `.githooks/pre-commit` |
| `cockpit/generate.mjs` | `cockpit/generate.mjs` |
| `skills/tech-planning/SKILL.md` | `.claude/skills/tech-planning/SKILL.md` |
| `skills/tech-build/SKILL.md` | `.claude/skills/tech-build/SKILL.md` |
| `skills/tech-qa/SKILL.md` | `.claude/skills/tech-qa/SKILL.md` |
| `skills/record-learnings/SKILL.md` | `.claude/skills/record-learnings/SKILL.md` |
| `skills/handoff/SKILL.md` | `.claude/skills/handoff/SKILL.md` |
| `skills/compass-check/SKILL.md` *(only if chosen in Q9)* | `.claude/skills/compass-check/SKILL.md` |
| `skills/compass-check/business-context.md` *(only if chosen in Q9)* | `.claude/skills/compass-check/business-context.md` |

The generated gate skills use repo-root-relative links (`../../../PROJECT-STATUS.md`) that resolve
correctly at that depth — keep them as-is.

## Step 3 — Write the QCode config (makes the project updatable)

Write **`.qcode/config.json`** at the repo root. This is what `qcode-sync` reads later to pull
framework updates without clobbering project-owned files:

```json
{
  "frameworkVersion": "{{FRAMEWORK_VERSION}}",
  "scaffoldedAt": "{{TODAY}}",
  "compassCheck": <true|false from Q9>,
  "tokens": {
    "PROJECT_NAME": "…", "PROJECT_SLUG": "…", "ONE_LINER": "…", "OWNER_NAME": "…",
    "TEAM_CONTEXT": "…", "VALUE_ARCHETYPES": "…", "DECISION_AXES": "…",
    "STACK_HOSTING": "…", "STACK_FRONTEND": "…", "STACK_BACKEND": "…",
    "STACK_DATA": "…", "STACK_AI": "…", "TENANCY": "…",
    "TYPED_RESULT_NAME": "…", "ACCESS_LAYER": "…"
  }
}
```

Record **every token you substituted** (multi-line tokens like `{{DOMAIN_SUMMARY}}`,
`{{ARCHITECTURE_OVERVIEW}}`, `{{HOUSE_STANDARDS}}`, `{{EPIC_TABLE}}` can be stored too — they just won't
be auto-re-rendered by the sync tool, which manages skills/hooks/cockpit, not the project-owned docs).

## Step 4 — Initialize git (if chosen)

```sh
git init -b main
git config core.hooksPath .githooks
chmod +x .githooks/pre-commit      # POSIX; on Windows the hook still runs via Git Bash
```

Don't commit automatically — let the user make the first commit so they own it.

## Step 5 — Hand back the keys

Close with a short report:

- **What was generated** (the tree above), and that status lives only in `PROJECT-STATUS.md`.
- **The `(to define)` gap checklist** — list every gap left in the generated files (from
  `references/filling-the-gaps.md`), so the team knows exactly what to resolve during foundation.
- **Next step:** run `tech-planning` for **Epic 01 — Foundation** to begin (plan-first applies from
  the very first line of code). The cockpit works immediately: `node cockpit/generate.mjs`.
- **Staying current:** the project records its framework version in `.qcode/config.json`; to pull later
  improvements run `qcode-sync` from a QCode-Method clone (see that repo's `docs/updating-projects.md`).
- Note that `qcode-project-scaffolder/` can now be deleted from the new repo if they want it gone.

## Why it's shaped this way

The interview front-loads the *value model and architecture* on purpose — those are what make the
generated CLAUDE.md and gates actually fit the new project instead of being generic boilerplate. And
the `(to define)` gaps are a feature, not laziness: a marked, instructed blank invites the team to
make the decision deliberately during foundation, which is exactly when they have the context to make
it well — far better than a hidden assumption inherited from another project's domain.
