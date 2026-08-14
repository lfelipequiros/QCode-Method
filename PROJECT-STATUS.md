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

**Updated:** 2026-08-14 · **Phase:** Building (epic 05) · **Branch:** `v2-extraction`

- **Last shipped:** [05.2](backlog/epic-05-generation-engine.md#052--generate-mode--the-scaffold) —
  `qcode.mjs generate`: five static-identity questions (flags, `--config`, or an interactive
  prompt), every judgment token left as an honest `(to define: … charter pass)` gap, self-tests
  before declaring success. Five real end-to-end runs (not just unit tests) found and fixed three
  more real bugs in shared infrastructure: a `business-context.md` render gap, a silent false-pass
  in `check-links.mjs` on a git-init-but-uncommitted project, and a CommonMark double-backtick
  escape it didn't understand. 40 tests total in `lib/`.
- **Next up:** `05.3` — the `qcode-charter` skill: the AI half of bootstrapping, interviewing for
  the judgment `generate` deliberately skipped and resolving every gap it left behind.

## Epics

| # | Epic | Status | Detail |
|---|------|--------|--------|
| 01 | Secure the base, stand up the board | `done` | [epic-01](backlog/epic-01-secure-base.md) |
| 02 | The shape and its enforcement | `done` | [epic-02](backlog/epic-02-shape-and-enforcement.md) |
| 03 | The gates | `done` | [epic-03](backlog/epic-03-the-gates.md) |
| 04 | The product layer | `done` | [epic-04](backlog/epic-04-product-layer.md) |
| 05 | The generation engine | `in-progress` | [epic-05](backlog/epic-05-generation-engine.md) |
| 06 | Assembly & release | `planned` | [epic-06](backlog/epic-06-assembly-and-release.md) |

## Active increments

Stories that are `in-progress` or `in-qa` appear here once pulled, with their status and a link to
the story in its epic.

| Story | Status | Link |
|-------|--------|------|
| 05.3 | `in-progress` | [epic-05 § 05.3](backlog/epic-05-generation-engine.md#053--qcode-charter-skill--the-charter) |

## Recently done — the increment log

| Story | Date | Detail |
|-------|------|--------|
| 05.2 | 2026-08-14 | [epic-05 § 05.2](backlog/epic-05-generation-engine.md#052--generate-mode--the-scaffold) — qcode.mjs generate, 3 more real bugs found and fixed, 40 tests total |
| 05.1 | 2026-08-14 | [epic-05 § 05.1](backlog/epic-05-generation-engine.md#051--the-unified-renderer-core) — lib/qcode-core.mjs, 35 tests, 4 real bugs found and fixed |
| 04.1 | 2026-08-14 | [epic-04 § 04.1](backlog/epic-04-product-layer.md#041--generalize-product-check--its-trackers) — product-check generalized, PDR log + surface map shipped |
| 03.4 | 2026-08-14 | [epic-03 § 03.4](backlog/epic-03-the-gates.md#034--compass-check--record-learnings-reconciliation) — ACCEPTED.md + board:check in the reconcile, repo-only memory, C9 write boundaries |
| 03.3 | 2026-08-14 | [epic-03 § 03.3](backlog/epic-03-the-gates.md#033--tech-qa-rewrite) — QA rounds, three-place close, merge authority |
| 03.2 | 2026-08-14 | [epic-03 § 03.2](backlog/epic-03-the-gates.md#032--tech-build-rewrite) — branch binding, 4th divergence lane, deliver/PR step |
| 03.1 | 2026-08-14 | [epic-03 § 03.1](backlog/epic-03-the-gates.md#031--tech-planning-rewrite) — story-as-file, four-lane routing, ADR bridge, branch contract |
| 02.4 | 2026-08-14 | [epic-02 § 02.4](backlog/epic-02-shape-and-enforcement.md#024--cockpit-evolution) — cockpit imports board-check's parsers, done/in-progress/flagged verified with synthetic data |
| 02.3 | 2026-08-14 | [epic-02 § 02.3](backlog/epic-02-shape-and-enforcement.md#023--rebuild-the-guard-as-a-shared-predicate) — status-guard.sh, check-links.mjs, index-backlog.mjs, CI template |
| 02.2 | 2026-08-13 | [epic-02 § 02.2](backlog/epic-02-shape-and-enforcement.md#022--port-board-checkmjs--fixture-tests) — board-check.mjs, 7 rules, 39 tests |
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
