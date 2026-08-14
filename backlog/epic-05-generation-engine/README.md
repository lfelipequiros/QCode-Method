# Epic 05 — The generation engine

**Goal.** Replace the 100%-AI scaffolder with a script-first engine: a deterministic renderer core
shared by four modes (`generate` / `sync` / `migrate` / `check`), a CLI that handles static facts,
and a new AI skill (`qcode-charter`) that handles only the judgment a script can't make.

**Value archetype.** Enabler — this is what makes every other epic *repeatable and verifiable*
instead of hand-copied. Built last on purpose: it renders the templates epics 02–04 define, so
there has to be a stable target before there's a renderer for it.

**Depends on.** Epic 02 (renders its board/backlog shape), conceptually also 03 and 04 (renders
their skill templates) — though the renderer core itself (05.1) only needs 02's template *paths*
to exist, not their final content, so it can start once 02 lands.

**Reference.** The extraction plan, theme T9 (migration craft); section 06 (the generation
engine); the three-beginnings naming decision (Scaffold → Charter → Foundation).

---

## Stories

| Story | Title |
|---|---|
| [05.1](05.1.md) | The unified renderer core |
| [05.2](05.2.md) | `generate` mode — the scaffold |
| [05.3](05.3.md) | `qcode-charter` skill — the charter |
| [05.4](05.4.md) | `migrate` + `check` modes |
