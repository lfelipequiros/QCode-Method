# 01 — Principles & Decisions (ADR log)

The architecture decision record. **New architecture is recorded here as a new ADR** — not in a
changelog and not in the status board. Each ADR is short: the decision, why, and the consequence.
This is how the project stays *traceable*: a future reader can see not just what the architecture is,
but why it became that.

## Format

```markdown
### ADR-NNN — <title>
**Status:** accepted | superseded by ADR-MMM | proposed
**Context.** <the forces at play; what made this a decision>
**Decision.** <what we chose>
**Consequence.** <what follows — the trade we accepted, what it enables/forecloses>
```

## Decisions

### ADR-001 — Plan-first, three-gate lifecycle
**Status:** accepted
**Context.** A small team can't afford code that silently drifts from intent; "temporary" shortcuts
become permanent when they're invisible.
**Decision.** All application code flows through `tech-planning` → `tech-build` → `tech-qa`, with a
single status board (`PROJECT-STATUS.md`), an ADR log (this file), a debt log with paydown triggers,
and a session journal (`handoffs/`).
**Consequence.** A little ceremony per increment, bought back many times over in traceability and the
absence of drift. The gates stay lightweight so they're never worth skipping.

*(to define: ADR-002+ — record the project's real decisions as they're made. The first few usually
cover: the data store choice; the seam(s) (ADR them — they're foundational); the tenancy mechanism;
and any stage-gating trigger you commit to.)*
