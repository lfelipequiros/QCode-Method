# 00 — Roadmap & Epic Map

The plan of action: the sequenced epics, why they're in this order, and the record of how decisions
were made. The [architecture/](../architecture/) ASD is the reference for *what is correct*; this
backlog is *what we build next*. Each epic links to its own file with stories and acceptance criteria.

> **Status:** Backlog defined, not started. No code is written until an epic is pulled and its stories
> approved (plan-first — `tech-planning`).

## Epic map

| # | Epic | Outcome | Value archetype | Depends on |
|---|---|---|---|---|
| 01 | **Foundation** | The skeleton everything hangs on: repo structure, data layer, the seam(s), secrets, CI. | Enabler (gates all later value) | — |
{{EPIC_TABLE_ROADMAP}}

*(to define: epics 02+ — name each one's outcome, value archetype, and dependency during planning.
Keep the order a dependency chain, not a priority guess: each epic should exist to unblock the next.)*

## Sequencing logic

*(to define: one paragraph per epic explaining why it's where it is — what it unblocks. This is where
Product and Engineering alignment gets recorded so the reasoning isn't lost.)*

## How to use this backlog

1. Pull one epic. Read its file.
2. Confirm its stories and acceptance criteria still hold (and resolve any "confirm in this epic"
   unknowns).
3. Get explicit approval (plan-first) before writing code — run `tech-planning`.
4. Build story by story (`tech-build`); each story's acceptance criteria are its definition of done;
   prove it with `tech-qa`.
