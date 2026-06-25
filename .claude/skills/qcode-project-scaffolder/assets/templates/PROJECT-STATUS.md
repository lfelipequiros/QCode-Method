# Project Status

Single source of truth for **where {{PROJECT_NAME}} stands** and **where the detail lives**. It owns
exactly one thing — the **status of epics and increments** — and links to everything else. It never
copies content that lives in another file (debt, questions, decisions, specs); it points to it.

> **Maintained by the lifecycle skills:** `tech-planning` → `tech-build` → `tech-qa`. Status changes
> only through them, in the same step as the work. If backlog or code changed, this board changed
> with it — a stale board is a bug.

**Updated:** {{TODAY}} · **Phase:** Planning — scaffold complete, no code yet · **Active:** none · **Next up:** Epic 01 (Foundation)

## Epics

| # | Epic | Status | Detail |
|---|------|--------|--------|
| 01 | Foundation | `planned` | [epic-01](backlog/epic-01-foundation.md) |
{{EPIC_TABLE}}
| 08 | Ad-hoc & improvements | open bucket | [08-adhoc](backlog/08-adhoc.md) |

## Active increments

Stories that are `in-progress` or `in-qa` appear here once pulled, with their status and a link to the
story in its epic. **None yet.**

## Recently done — the increment log

The chronological record of what shipped (changelog handled by the structure, not a separate file).
Done stories roll up here, newest first, with date + link. **Nothing shipped yet.**

## How status works

- **Vocabulary:** `planned` → `in-progress` → `in-qa` → `done`, plus `blocked` and `deferred`.
- **Status lives only here** (zero duplication). Stories in the epic files carry no status line; a
  story that isn't listed individually inherits its epic's status (everything is `planned` until
  pulled).
- A story gets its own row under **Active increments** when work starts, then moves to **Recently
  done** when `tech-qa` passes it.

## Where the detail lives — directory (links only, no copies)

- **Why / specs** → [architecture/](architecture/) · [README](README.md)
- **Architecture decisions & changes** → [architecture/01-principles-and-decisions.md](architecture/01-principles-and-decisions.md)
  — the ADR log. *New architecture is recorded as a new ADR here*, not in a changelog.
- **Tech debt** → [TECH-DEBT.md](TECH-DEBT.md)
- **Open questions** → [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md)
- **The plan** → [backlog/](backlog/) (roadmap + epics + stories)
