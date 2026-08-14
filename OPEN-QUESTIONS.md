# Open Questions & Things to Figure Out

A living list of decisions that depend on information only the framework's owner can supply.
Items are grouped by who unblocks them. When answered, move the item to **Resolved** with the
answer and date — keep it, the answer is the record.

---

## For the owner

| ID | Question | Why it matters | Blocks |
|----|----------|-----------------|--------|
| *(none open — all four "still to decide" items from the extraction plan were closed on 2026-08-13: dogfooding, the `architecture` skill's status, stage naming, and distribution.)* | | | |

## Resolved

| ID | Question | Answer | Date |
|----|----------|--------|------|
| — | Does QCode-Method dogfood its own method for the v2 build? | Yes — this board is the result. | 2026-08-13 |
| — | Where does the `architecture` skill (used by the ADR bridge) come from? | Stays a vendor skill, declared in `skills-lock.json` (06.2), not bundled. Its differing standalone ADR format is what the bridge exists to reconcile. | 2026-08-13 |
| — | What are the two bootstrap stages called? | Scaffold (structure exists) → Charter (intent is written down) → Foundation stays Epic 01 (technical substrate). | 2026-08-13 |
| — | How is QCode-Method distributed? | Clone-and-run for now. Packaging deferred on this backlog (06.2) with a named trigger. | 2026-08-13 |
