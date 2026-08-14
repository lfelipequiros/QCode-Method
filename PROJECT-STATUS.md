# Project Status

Single source of truth for **where the QCode-Method v2 build stands** and **where the detail
lives**. Owns exactly one thing — the status of epics and increments — and links to everything
else. QCode-Method now dogfoods its own method: this board tracks the v2 extraction plan's six
epics and sixteen stories, built on the `v2-extraction` branch.

**Updated:** 2026-08-14 · **Phase:** v2.0.0 shipped · **Branch:** `v2-extraction`

- **Last shipped:** [06.2](backlog/epic-06-assembly-and-release/06.2.md) — the release gate. `VERSION`
  reads `2.0.0` at both the framework root and the scaffolder folder. `skills-lock.json` shipped for
  real, resolving the dead links `tech-planning` (03.1) and `compass-check` (03.4) have carried since
  those stories — a real `generate` run's self-test passed clean on the first try for the first time
  all session. `README.md` and `docs/updating-projects.md` rewritten around the real, unified
  `qcode.mjs` (`generate`/`sync`/`migrate`/`check`); `scripts/qcode-sync.mjs` retired outright once
  `sync` was confirmed a complete superset. **The day-one acceptance test ran end to end, for real, on
  a genuine scratch directory:** generate → zero unresolved tokens, `board:check` 0, `check:links`
  green, cockpit renders → a real first commit with hooks genuinely active, `status-guard.sh` running
  `board:check` inside the commit itself → `sync` reporting zero diffs (idempotent) → `check` reporting
  structurally valid with an honest open-gap count. All seven steps passed. **This closes the entire
  sixteen-story v2 extraction plan** — every epic below is `done`.
- **Next up:** nothing queued. The `v2-extraction` branch is ready to merge; the framework now
  dogfoods its own final v2 shape, on itself, as of this commit.

## Epics

| # | Epic | Status | Detail |
|---|------|--------|--------|
| 01 | Secure the base, stand up the board | `done` | [epic-01](backlog/epic-01-secure-base/README.md) |
| 02 | The shape and its enforcement | `done` | [epic-02](backlog/epic-02-shape-and-enforcement/README.md) |
| 03 | The gates | `done` | [epic-03](backlog/epic-03-the-gates/README.md) |
| 04 | The product layer | `done` | [epic-04](backlog/epic-04-product-layer/README.md) |
| 05 | The generation engine | `done` | [epic-05](backlog/epic-05-generation-engine/README.md) |
| 06 | Assembly & release | `done` | [epic-06](backlog/epic-06-assembly-and-release/README.md) |

## Active increments

Stories that are `in-progress` or `in-qa` appear here once pulled, with their status and a link to
the story in its epic. **None yet.**

## Needs status review

Stories the board can't confirm — a claimed status with no merged PR behind it. A to-do list, not a
status: resolve each by checking the PR/branch and correcting or removing the row. **None yet.**

## How status works

- **Vocabulary:** `planned` → `in-progress` → `in-qa` → `done`, plus `blocked` and `deferred`.
- **Status lives only here** (zero duplication). Stories in the epic files carry no status line; a
  story that isn't listed individually inherits its epic's status.
- A story gets its own row under **Active increments** when work starts. It comes **off** this board —
  never into a "done" section here — the moment `tech-qa` passes it: that same commit appends its row
  to [`backlog/CLOSED.md`](backlog/CLOSED.md) and flips it to `done`.

## Where the detail lives

- **Closed work (shipped stories)** → [backlog/CLOSED.md](backlog/CLOSED.md) — append-only index.
- **Accepted-but-not-yet-planned decisions** → [backlog/ACCEPTED.md](backlog/ACCEPTED.md)
- **The plan** → [backlog/00-roadmap.md](backlog/00-roadmap.md) + the six epic files
- **The reasoning behind the shape** → the extraction plan artifact (published 2026-08-13,
  decisions-closed revision) — cited from each story rather than restated
- **Tech debt** → [TECH-DEBT.md](TECH-DEBT.md)
- **Open questions** → [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md)
