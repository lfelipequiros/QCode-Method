# Closed

The append-only index of shipped stories — the record of what's `done`. A story's row lands here the
moment `tech-qa` passes it, in the same commit that removes its row from
[`PROJECT-STATUS.md`](../PROJECT-STATUS.md).

- **Append-only.** Add a row when a story ships; never edit, reorder, or delete a row once it's
  written. Correcting a mistake means a new row, not a rewrite of an old one.
- **One story, one row.** Never pack two story ids into a single row — even for stories that shipped
  together, each gets its own line. A two-id row breaks any parser or script that reads the first id
  on a line as *the* id for that row.
- **Carries ids, links and a status — not the story.** For *why* and *how* it shipped, follow the
  Detail link to the story file itself; this index never restates that reasoning.

| Story | Date | PR | Detail |
|---|---|---|---|
| 05.4 | 2026-08-14 | — | [epic-05 § 05.4 — migrate + check + sync modes; migrate converted this repo's own backlog for real, 12 real bugs found and fixed along the way](epic-05-generation-engine/05.4.md) |
| 05.3 | 2026-08-14 | — | [epic-05 § 05.3 — qcode-charter skill, orchestrator slimmed to 5 steps, a real generate run caught a live-token-in-prose bug, 2 stale docs fixed](epic-05-generation-engine/05.3.md) |
| 05.2 | 2026-08-14 | — | [epic-05 § 05.2 — qcode.mjs generate, 3 more real bugs found and fixed, 40 tests total](epic-05-generation-engine/05.2.md) |
| 05.1 | 2026-08-14 | — | [epic-05 § 05.1 — lib/qcode-core.mjs, 35 tests, 4 real bugs found and fixed](epic-05-generation-engine/05.1.md) |
| 04.1 | 2026-08-14 | — | [epic-04 § 04.1 — product-check generalized, PDR log + surface map shipped](epic-04-product-layer/04.1.md) |
| 03.4 | 2026-08-14 | — | [epic-03 § 03.4 — ACCEPTED.md + board:check in the reconcile, repo-only memory, C9 write boundaries](epic-03-the-gates/03.4.md) |
| 03.3 | 2026-08-14 | — | [epic-03 § 03.3 — QA rounds, three-place close, merge authority](epic-03-the-gates/03.3.md) |
| 03.2 | 2026-08-14 | — | [epic-03 § 03.2 — branch binding, 4th divergence lane, deliver/PR step](epic-03-the-gates/03.2.md) |
| 03.1 | 2026-08-14 | — | [epic-03 § 03.1 — story-as-file, four-lane routing, ADR bridge, branch contract](epic-03-the-gates/03.1.md) |
| 02.4 | 2026-08-14 | — | [epic-02 § 02.4 — cockpit imports board-check's parsers, done/in-progress/flagged verified with synthetic data](epic-02-shape-and-enforcement/02.4.md) |
| 02.3 | 2026-08-14 | — | [epic-02 § 02.3 — status-guard.sh, check-links.mjs, index-backlog.mjs, CI template](epic-02-shape-and-enforcement/02.3.md) |
| 02.2 | 2026-08-13 | — | [epic-02 § 02.2 — board-check.mjs, 7 rules, 39 tests](epic-02-shape-and-enforcement/02.2.md) |
| 02.1 | 2026-08-13 | — | [epic-02 § 02.1 — the ADR-059 shape in the scaffolder templates](epic-02-shape-and-enforcement/02.1.md) |
| 01.1 | 2026-08-13 | — | [epic-01 § 01.1 — v1.0.2 + branch + board bootstrap](epic-01-secure-base/01.1.md) |
