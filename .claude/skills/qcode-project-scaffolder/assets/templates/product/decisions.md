# Product Decision Records (PDR)

The product-layer sibling to
[`architecture/01-principles-and-decisions.md`](../architecture/01-principles-and-decisions.md)'s ADR
log. An ADR settles a *technical* architecture question (which database, which seam); a **PDR**
settles a *product/UX* question that should hold across surfaces and stay consistent going forward —
a surface's job boundary, a naming/vocabulary convention, a recurring UX pattern. Where an ADR is
cited to justify a technical choice, a PDR is cited to justify a **product** one — including, most
often, to push back on a new request that would quietly break an existing convention.

**Append-only, numbered sequentially.** Maintained by the
[`product-check`](../.claude/skills/product-check/SKILL.md) skill — a new PDR is added only for a
genuinely new *durable* product call, not for every requirement it processes. Most requirements cite
an existing PDR rather than minting a new one.

**House shape**, matching the ADR log's terseness:

```markdown
### PDR-0NN — <short imperative title>

**Decision.** <the call, in one or two sentences.>

**Context.** <the forces; why this needed deciding.>

**Consequence.** <what this governs going forward; link the epic(s) it came from and lives in.>
```

---

## Owed — decided in principle, not yet minted

A PDR that is *known to be needed* but whose content is not yet determined. Listed here so the
obligation survives the story that raised it; each becomes a numbered PDR above when its content is
settled. Not a backlog — if an entry here stops being owed, delete it and say why.

*(none yet)*

---

## PDRs

*(none yet — `product-check` appends here as durable product calls get made)*
