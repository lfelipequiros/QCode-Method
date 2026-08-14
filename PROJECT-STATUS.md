# Project Status

Single source of truth for **where the QCode-Method v2 build stands** and **where the detail
lives**. Owns exactly one thing — the status of epics and increments — and links to everything
else. QCode-Method now dogfoods its own method: this board tracks the v2 extraction plan's six
epics and sixteen stories, built on the `v2-extraction` branch.

> **v1 board shape, deliberately.** This board uses the pre-ADR-059 flat shape (epics as single
> files, a "Recently done" log here) because the v2 engine that would produce the ADR-059 shape
> doesn't exist until epic 05 ships. Once it does, this repo becomes `migrate` mode's first test
> subject (see [05.4](backlog/epic-05-generation-engine.md#054--migrate--check-modes)) — proving
> the v1→v2 path on itself before it's ever run against a consumer project.

**Updated:** 2026-08-13 · **Phase:** Building (epic 02) · **Branch:** `v2-extraction`

- **Last shipped:** [02.1](backlog/epic-02-shape-and-enforcement.md#021--information-architecture-the-adr-059-shape) —
  the ADR-059 shape landed in the scaffolder templates: open-work-only board, `CLOSED.md` /
  `ACCEPTED.md`, epic-01-foundation split into per-story files, the ad-hoc bucket restructured.
- **Next up:** `02.2` — port `board-check.mjs` + its fixture tests, so the shape 02.1 just wrote
  becomes machine-checked rather than merely documented.

## Epics

| # | Epic | Status | Detail |
|---|------|--------|--------|
| 01 | Secure the base, stand up the board | `done` | [epic-01](backlog/epic-01-secure-base.md) |
| 02 | The shape and its enforcement | `in-progress` | [epic-02](backlog/epic-02-shape-and-enforcement.md) |
| 03 | The gates | `planned` | [epic-03](backlog/epic-03-the-gates.md) |
| 04 | The product layer | `planned` | [epic-04](backlog/epic-04-product-layer.md) |
| 05 | The generation engine | `planned` | [epic-05](backlog/epic-05-generation-engine.md) |
| 06 | Assembly & release | `planned` | [epic-06](backlog/epic-06-assembly-and-release.md) |

## Active increments

Stories that are `in-progress` or `in-qa` appear here once pulled, with their status and a link to
the story in its epic.

| Story | Status | Link |
|-------|--------|------|
| 02.2 | `in-progress` | [epic-02 § 02.2](backlog/epic-02-shape-and-enforcement.md#022--port-board-checkmjs--fixture-tests) |

## Recently done — the increment log

| Story | Date | Detail |
|-------|------|--------|
| 02.1 | 2026-08-13 | [epic-02 § 02.1](backlog/epic-02-shape-and-enforcement.md#021--information-architecture-the-adr-059-shape) — the ADR-059 shape in the scaffolder templates |
| 01.1 | 2026-08-13 | [epic-01 § 01.1](backlog/epic-01-secure-base.md#011--commit-token-discipline-v102-branch-bootstrap-the-board) — v1.0.2 + branch + board bootstrap |

## How status works

- **Vocabulary:** `planned` → `in-progress` → `in-qa` → `done`, plus `blocked` and `deferred`.
- **Status lives only here** (zero duplication). Stories in the epic files carry no status line; a
  story that isn't listed individually inherits its epic's status.
- A story gets its own row under **Active increments** when its subagent pass starts, then moves to
  **Recently done** once its QA pass confirms the acceptance criteria and it's committed.

## Where the detail lives

- **The plan** → [backlog/00-roadmap.md](backlog/00-roadmap.md) + the six epic files
- **The reasoning behind the shape** → the extraction plan artifact (published 2026-08-13,
  decisions-closed revision) — cited from each story rather than restated
- **Tech debt** → [TECH-DEBT.md](TECH-DEBT.md)
- **Open questions** → [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md)
