# Epic 03 — The gates

**Goal.** Carry Mompa's hardened gate behavior — the branch/PR delivery contract, the four-lane
finding taxonomy with its ADR bridge, QA rounds and the three-place close — into the scaffolder's
`tech-planning` / `tech-build` / `tech-qa` templates, and reconcile `compass-check` +
`record-learnings` against the new shape.

**Value archetype.** Extraction + prevent-drift — this is where the old write-proxy guard's
failure mode (proves written, not true) gets replaced across the actual gates that create and
close stories, not just the board that records them.

**Depends on.** Epic 02 (the gates reference the new board/backlog layout directly).

**Reference.** The extraction plan, themes T3 (delivery contract), T4 (four lanes + ADR bridge),
T5 (QA rounds); composition finding C9; reverse-drift items R2, R3.

---

## Stories

| Story | Title |
|---|---|
| [03.1](03.1.md) | `tech-planning` rewrite |
| [03.2](03.2.md) | `tech-build` rewrite |
| [03.3](03.3.md) | `tech-qa` rewrite |
| [03.4](03.4.md) | `compass-check` + `record-learnings` reconciliation |
