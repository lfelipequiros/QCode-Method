# QCode-Method

A reusable, **app-agnostic operating system for AI-driven software development** — the same plan-first
discipline, single-source-of-truth status board, traceable decisions, knowledge-loop, session
continuity, and live progress cockpit, proven on a real platform and generalized so it can be **stamped
into any new project** and **kept up to date** as the method improves.

This repo is the **framework itself**, not an application. You don't run a project *here*; you scaffold
*other* repos from here, then pull improvements back into them.

## What you get in a scaffolded project

- **Four lifecycle gates** (skills): `product-check` → `tech-planning` → `tech-build` → `tech-qa`.
  `product-check` shapes and gatekeeps a new idea before it reaches architecture (skipped for work
  with no product-facing requirement, like Foundation or a bug fix); no application code is written
  without an approved, architecture-aligned backlog story; the build implements only that increment;
  QA proves it's done-done. A built-in **architecture-decision lane** routes every finding to one
  home (cite a rule · open an ADR · log debt · raise an open question).
- **`record-learnings`** — an end-of-session sweep that catches durable knowledge the gates missed and
  routes each item to its canonical file (ADR / TECH-DEBT / OPEN-QUESTIONS / CLAUDE.md / backlog /
  product / handoffs) — every destination a committed, repo-owned surface, never an external memory
  store.
- **`handoff`** — durable session summaries so a new chat resumes without replaying the transcript.
- **`compass-check`** *(optional)* — a read-only "CTO conscience" that sits *above* the gates and
  advises on direction: what to build next, what you're not planning for, whether you're over-building.
- **A single status board** (`PROJECT-STATUS.md`) with zero status duplication, backstopped by a
  **`.githooks/pre-commit`** guard that blocks plan/code commits that don't move the board.
- **Orientation + spec docs** — `CLAUDE.md` (how we operate), `architecture/` (the ASD + ADR log),
  `backlog/` (sequenced epics/stories), and the `TECH-DEBT` / `OPEN-QUESTIONS` trackers.
- **A zero-dependency cockpit** — `node cockpit/generate.mjs` renders a live progress diagram parsed
  straight from the board + backlog.

## Repository layout

```
QCode-Method/
├── VERSION                                  # framework version (mirrors the scaffolder's VERSION)
├── README.md                                # this file
├── qcode.mjs                                # the CLI — one renderer, four modes: generate/sync/migrate/check
├── lib/
│   ├── qcode-core.mjs                       # shared rendering core every mode is built on
│   └── qcode-migrate.mjs                    # v1 -> v2 backlog-shape parsing/transform (migrate's engine)
├── schema/                                  # documented JSON contracts (not runtime-validated — zero deps)
│   ├── config.schema.json                   # the .qcode/config.json contract
│   └── skills-lock.schema.json              # the skills-lock.json contract
├── docs/
│   └── updating-projects.md                 # how framework updates flow into a scaffolded project
└── .claude/skills/qcode-project-scaffolder/  # the bootstrapper: orchestrator + template source
    ├── SKILL.md                              # gathers static facts, drives `qcode.mjs generate`
    ├── VERSION                               # canonical framework version (travels with the folder)
    ├── references/filling-the-gaps.md        # the {{token}} list + the (to define) gap checklist
    └── assets/templates/                     # parameterized copies of every generated file,
        └── skills/qcode-charter/             # including the judgment-interview skill `generate` hands off to
```

## Use 1 — Scaffold a new project

Nothing needs to be copied anywhere first — run this **from a QCode-Method clone**, pointed at
wherever the new project should live:

1. Invoke the **`qcode-project-scaffolder`** skill. It asks only five static-identity facts (name,
   slug, owner, git remote, whether to init git + install `compass-check`) — no value model, stack,
   or architecture questions here.
2. It drives `node qcode.mjs generate <target-dir> ...`, which renders the whole operating system —
   substituting your five answers for their `{{TOKEN}}` blanks, defaulting what it reasonably can,
   and leaving every judgment token as an explicit `(to define: … resolve during the qcode-charter
   pass.)` gap — then self-tests the result (`board:check` + the cockpit must both succeed) before
   declaring success.
3. It writes `.qcode/config.json` (the framework version + your answers) so the project can later
   pull updates, and hands off to the **`qcode-charter`** skill — now present in the new project —
   for the judgment interview (goal, value model, stack, architecture, roadmap) that resolves those
   gaps.
4. Start building: run `tech-planning` for **Epic 01 — Foundation**. The cockpit works immediately
   (`node cockpit/generate.mjs`).

> **Two kinds of blank** (see `references/filling-the-gaps.md`): `{{TOKEN}}` is filled *now* from the
> interview; `(to define: what — how/when)` is a deliberate, instructed gap you fill *during project
> foundation*, when you actually have the context to decide well.

## Use 2 — Update an already-scaffolded project

When the framework improves, pull it into a project with **`qcode.mjs sync`**, from a fresh
QCode-Method clone (see [`docs/updating-projects.md`](docs/updating-projects.md) for the full
framework-owned vs. project-owned split):

```sh
node qcode.mjs sync "../your-project"            # dry-run: show what would change
node qcode.mjs sync "../your-project" --write     # apply (backs up changed files, bumps version)
```

It only re-renders **framework-owned** files (the gates, `record-learnings`, `handoff`,
`compass-check`, the pre-commit guard, `.gitattributes`, the cockpit, the CI template). Your
**project-owned** files (`CLAUDE.md`, the board, backlog, architecture, README, trackers,
`business-context.md`, `skills-lock.json`) are never touched. It's diff-first and backs up every file
it overwrites — treat it as an assisted merge. A file the project has declared `customized` in
`.qcode/config.json` is shown as a diff but never overwritten without `--force`.

## Use 3 — Bring an older v1-shaped project into the current shape

A project scaffolded before the ADR-059 board/backlog shape existed (flat `epic-NN.md` files, a
"Recently done" log on the board) needs a one-time structural conversion `sync` deliberately never
does — the shape change touches project-owned files sync never writes. `qcode.mjs migrate` does this;
it's exactly how this repo's own board got here (see `backlog/CLOSED.md` §05.4). Dry-run by default:

```sh
node qcode.mjs migrate "../your-project"           # dry-run: report the full split/move plan
node qcode.mjs migrate "../your-project" --write    # apply, then installs the operational tooling too
```

## Use 4 — Check a project's readiness

```sh
node qcode.mjs check "../your-project"
```

Reports two distinct signals: **structural validity** (does `board:check` pass, does the cockpit
render — exit 0 means yes) and **completeness** (how many `(to define)` gaps remain open — an honest
count, not a failure by itself). An incomplete-but-valid project is not the same as a broken one.

## Install

Clone and run — no package to install:

```sh
git clone <this-repo-url> qcode-method
cd qcode-method
node qcode.mjs generate ../your-new-project --name "Your Project" --owner "You"
```

**Deferred: an installable package** (`npx qcode-method generate ...` without a local clone).
Clone-and-run is simpler to reason about and to keep in sync with while the framework itself is still
young; packaging it adds a publish/version-tag step for no benefit until there's a real second
consumer. **Trigger:** the first time a second person, or a second machine, needs to scaffold a
project and a fresh `git clone` is genuinely more friction than it's worth.

## Why it's shaped this way

A project's *discipline and structure* are reusable; its *domain, value model, stack, and architecture*
are not. So QCode-Method generates the first fully and **interviews you for the second** — and where an
answer can't be settled at scaffold time, it leaves a marked, instructed blank rather than a silent
assumption. The same split makes projects safely updatable: framework-owned files can be re-rendered;
project-owned files stay yours.
