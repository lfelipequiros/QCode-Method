# Epic 01 — Foundation

**Goal.** Stand up the skeleton everything else hangs on: the repository structure, the data layer,
the project's stable seam(s), secret handling, and minimal CI. Nothing here produces value directly —
it gates every later epic, so it stays lean.

**Value archetype.** Enabler. No direct value; justified as the substrate for everything that follows.

**Depends on.** Nothing.

**Reference.** [architecture/](../../architecture/) — settle the `(to define)` gaps as you go.

---

## Stories

| Story | Title |
|---|---|
| [01.1](01.1.md) | Repository & app structure |
| [01.2](01.2.md) | Data layer & migration tooling |
| [01.3](01.3.md) | Secrets & environment |
| [01.4](01.4.md) | The seam(s) |
| [01.5](01.5.md) | Minimal CI |

---

## Definition of done (epic)

- An empty-but-correct platform: data store up with the core tables + the seam(s) in place, secrets
  wired, CI green, and the `(to define)` architecture gaps resolved + recorded as ADRs.
