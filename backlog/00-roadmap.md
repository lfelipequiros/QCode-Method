# 00 — Roadmap & Epic Map

QCode-Method's own backlog — the framework dogfoods its own method starting with this build.
Six epics implement the **v2 extraction plan** (Mompa's hardened SDLC pulled back into the
white-label framework, plus a script-first generation engine). Written in the **v1 board shape**
deliberately: the v2 tooling this backlog builds doesn't exist yet, so this repo becomes
`migrate` mode's first real test subject once epic 05 lands (see 05.4).

> **Source of truth for the reasoning:** the extraction plan artifact (published 2026-08-13,
> revised through decisions-closed). This backlog operationalizes it; where this backlog and the
> plan ever disagree, this backlog wins — it's the one that's actually being built against.

## Epic map

| # | Epic | Outcome | Depends on |
|---|---|---|---|
| 01 | **Secure the base, stand up the board** | v1.0.2 shipped; this backlog exists | — |
| 02 | **The shape and its enforcement** | ADR-059 board/backlog shape + machine-checked guard, in the templates | 01 |
| 03 | **The gates** | tech-planning/build/qa carry the branch contract, four lanes, QA rounds | 02 |
| 04 | **The product layer** | product-check ships as a core, always-installed gate | 03 |
| 05 | **The generation engine** | one renderer, four modes (`generate`/`sync`/`migrate`/`check`), script-first | 02 (renders the templates 02–04 produce) |
| 06 | **Assembly & release** | CLAUDE.md rewrite, docs, v2.0.0 tag, day-one acceptance test | 03, 04, 05 |

## Sequencing logic

**01 → 02** because every later epic assumes the ADR-059 shape exists in the templates.
**02 → 03** because the gates reference the new board/backlog layout directly (story-is-a-file,
CLOSED.md, the status vocabulary) — writing them before 02 lands would mean rewriting them twice.
**03 → 04** because the product gate's lifecycle diagram and hand-off language cite the tech-* gates
by their v2 shape. **02 → 05** because the renderer's job is to emit exactly what 02–04 define; the
engine is built last on purpose, once there's a stable target to render. **03, 04, 05 → 06** because
release is the assembly step — nothing to assemble until the pieces exist.

Within epic 03, the four gate rewrites are logically independent of each other (they touch different
files) but are still built **sequentially**, one subagent + QA pass at a time, so each can be checked
against the composition fixes (C1–C9) before the next assumes it landed.

## How to use this backlog

1. Pull one epic; read its file for full story detail.
2. Each story ends with acceptance criteria pulled from the plan's composition audit and work-package
   descriptions — that's the definition of done, checked in QA before the story closes.
3. Stories close in [`PROJECT-STATUS.md`](../PROJECT-STATUS.md) → *Recently done* (v1 board shape).
