# Project Status

Single source of truth for **where the QCode-Method v2 build stands** and **where the detail
lives**. Owns exactly one thing — the status of epics and increments — and links to everything
else. QCode-Method now dogfoods its own method: this board tracks the v2 extraction plan's six
epics and sixteen stories, built on the `v2-extraction` branch.

**Updated:** 2026-08-14 · **Phase:** Building (epic 06) · **Branch:** `v2-extraction`

- **Last shipped:** [06.1](backlog/epic-06-assembly-and-release/06.1.md) — the `CLAUDE.md` template
  rewrite. §7 expanded from a flat list into 11 numbered subsections; §7.2 is now the delivery
  contract's one canonical statement, §7.3 is Fix C8's wrap-up chain (`product-check` → `tech-planning`
  → `tech-build` → PR → `tech-qa` → merge → `record-learnings`, `handoff` explicitly off-spine), §7.7
  is the repo-only memory routing table. Every gate template that used to restate the contract now
  links to §7.2 instead. Verifying the link additions surfaced a real, pre-existing bug dating back to
  03.1/03.3: `tech-qa`'s seam-invariant gap used different wording than `tech-planning`'s and
  `tech-build`'s, so `qcode-charter`'s own documented grep for resolving it identically across all
  three would have silently missed `tech-qa`'s copy. Fixed — all three now match.
- **Next up:** `06.2` — docs, tokens, `skills-lock.json`, the `VERSION` 2.0.0 bump, and the real,
  end-to-end day-one acceptance test. The release gate for the whole v2 extraction.

## Epics

| # | Epic | Status | Detail |
|---|------|--------|--------|
| 01 | Secure the base, stand up the board | `done` | [epic-01](backlog/epic-01-secure-base/README.md) |
| 02 | The shape and its enforcement | `done` | [epic-02](backlog/epic-02-shape-and-enforcement/README.md) |
| 03 | The gates | `done` | [epic-03](backlog/epic-03-the-gates/README.md) |
| 04 | The product layer | `done` | [epic-04](backlog/epic-04-product-layer/README.md) |
| 05 | The generation engine | `done` | [epic-05](backlog/epic-05-generation-engine/README.md) |
| 06 | Assembly & release | `in-progress` | [epic-06](backlog/epic-06-assembly-and-release/README.md) |

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
