# Project Status

Single source of truth for **where {{PROJECT_NAME}} stands** and **where the detail lives**. It owns
exactly one thing — the **status of epics and increments** — and links to everything else. It never
copies content that lives in another file (debt, questions, decisions, specs); it points to it.

> **This board holds OPEN work only.** The moment a story is `done`, its row comes off this file and
> a one-line record is appended to the closed index at [`backlog/CLOSED.md`](backlog/CLOSED.md) — in
> the same commit. Never list closed work here.

> **The governing rule for this whole shape:** A high-level file carries ids, links and a status. The
> file that carries the DETAIL is the individual story or epic file.

> **Maintained by the lifecycle skills:** `tech-planning` → `tech-build` → `tech-qa`. Status changes
> only through them, in the same step as the work. If backlog or code changed, this board changed
> with it — a stale board is a bug.

**Updated:** {{TODAY}} · **Phase:** Planning — scaffold complete, no code yet · **Active:** none · **Next up:** Epic 01 (Foundation)

## Epics

| # | Epic | Status | Detail |
|---|------|--------|--------|
| 01 | Foundation | `planned` | [epic-01](backlog/epic-01-foundation/README.md) |
{{EPIC_TABLE}}
| 08 | Ad-hoc & improvements | `planned` | [08-adhoc](backlog/08-adhoc/README.md) |

## Active increments

Stories that are `in-progress` or `in-qa` appear here once pulled, with their status and a link to the
story in its epic. **None yet.**

## Needs status review

Stories the board can't confirm — a claimed status with no merged PR behind it. A to-do list, not a
status: resolve each by checking the PR/branch and correcting or removing the row. **None yet.**

## How status works

- **Vocabulary** (exact tokens, in this order): `raised`, `planned`, `in-progress`, `in-qa`, `done`, `blocked`, `deferred`.
  `raised` comes before `planned` — a story that's been filed by `product-check`, this project's
  upstream product gate, but hasn't yet been through `tech-planning`.
- **Aliases** — a project's board may carry either of these in place of the canonical token; both
  parse as their mapped value: `open` → treated as `in-progress`; `needs product-check` → treated as
  `raised`.
- **Status cell rule** — a Status cell holds a bare token, nothing else: no clause, no PR link, no
  parenthetical explaining the round. Need to say more? That's what the Detail column is for.
- **Status lives only here** (zero duplication). A story's own file carries no status line; a story
  that isn't listed individually inherits its epic's status (everything is `planned` until pulled).
- A story gets its own row under **Active increments** when work starts. It comes **off** this board —
  never into a "done" section here — the moment `tech-qa` passes it: that same commit appends its row
  to [`backlog/CLOSED.md`](backlog/CLOSED.md) and flips it to `done`.

## Where the detail lives — directory (links only, no copies)

- **Why / specs** → [architecture/](architecture/) · [README](README.md)
- **Architecture decisions & changes** → [architecture/01-principles-and-decisions.md](architecture/01-principles-and-decisions.md)
  — the ADR log. *New architecture is recorded as a new ADR here*, not in a changelog.
- **Tech debt** → [TECH-DEBT.md](TECH-DEBT.md)
- **Open questions** → [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md)
- **The plan** → [backlog/](backlog/) (roadmap + epics + stories)
- **Closed work (shipped stories)** → [backlog/CLOSED.md](backlog/CLOSED.md) — append-only index.
- **Accepted-but-not-yet-planned decisions** → [backlog/ACCEPTED.md](backlog/ACCEPTED.md)
