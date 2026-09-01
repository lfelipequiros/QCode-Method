# Epic 02 — The shape and its enforcement

**Goal.** Land the ADR-059 information architecture (story-is-a-file, board holds open work only,
closed work is an append-only index) into the scaffolder templates, plus the machine-checked
enforcement that proves the shape stays true — not just that it was written. This is the spine:
every later epic assumes this layout exists.

**Value archetype.** Extraction — Mompa's board hit 555 KB / 1,795 lines and its backlog 1.45 MB
before this shape and its enforcement existed; it is proven under real load, not speculative.

**Depends on.** Epic 01.

**Reference.** The extraction plan, themes T1 (information architecture), T2 (mechanized
enforcement), T8 (cockpit evolution); composition findings C1–C6.

---

## Stories

| Story | Title |
|---|---|
| [02.1](02.1.md) | Information architecture: the ADR-059 shape |
| [02.2](02.2.md) | Port `board-check.mjs` + fixture tests |
| [02.3](02.3.md) | Rebuild the guard as a shared predicate |
| [02.4](02.4.md) | Cockpit evolution |
