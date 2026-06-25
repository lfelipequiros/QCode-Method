# Epic 01 — Foundation

**Goal.** Stand up the skeleton everything else hangs on: the repository structure, the data layer,
the project's stable seam(s), secret handling, and minimal CI. Nothing here produces value directly —
it gates every later epic, so it stays lean.

**Value archetype.** Enabler. No direct value; justified as the substrate for everything that follows.

**Depends on.** Nothing.

**Reference.** [architecture/](../architecture/) — settle the `(to define)` gaps as you go.

---

## Stories

### 01.1 — Repository & app structure

Establish the repo layout (apps, shared packages, the entry points), strict types, lint + format,
and the logging convention. README points to the docs as the source of truth.

**Acceptance criteria**
- A clear layout exists for the app(s), any shared packages, and the data-access seam.
- Strict types on across the repo; lint + format config present.
- House standards documented for contributors (CLAUDE.md §6).

### 01.2 — Data layer & migration tooling

Create the data store and the mechanism for versioned, reviewed schema migrations.

**Acceptance criteria**
- The data store exists (dev at minimum; prod plan noted).
- Schema changes are versioned files, never ad hoc.
- *(to define: the core/canonical tables and the tenancy mechanism `{{TENANCY}}` — design in
  `architecture/` and record as an ADR.)*
- "No schema change without the matching `{{ACCESS_LAYER}}` update" documented in the workflow.

### 01.3 — Secrets & environment

Server-side-only secret handling, least privilege, nothing committed.

**Acceptance criteria**
- All secrets in the host's env vars; `.env*` and `credentials/` gitignored.
- A documented place for each credential the project needs (a committed `.env.example` is the clean
  onboarding artifact).

### 01.4 — The seam(s)

Define the project's stable interface(s) — the contract(s) the rest of the system depends on.

**Acceptance criteria**
- *(to define: the seam contract(s) — e.g. a source/connector interface and/or the `{{ACCESS_LAYER}}`
  read contract. Use `{{TYPED_RESULT_NAME}}` and validate at the boundary. Record the design as an
  ADR.)*
- A trivial fixture implementation proves the interface compiles and is testable.

### 01.5 — Minimal CI

**Acceptance criteria**
- CI runs typecheck + lint + tests on push.
- **Status-board guard in CI** — a server-side check (the un-bypassable backstop to the local
  `.githooks/pre-commit` hook) fails a push/PR that changes `backlog/` or app code without updating
  `PROJECT-STATUS.md`.

---

## Definition of done (epic)

- An empty-but-correct platform: data store up with the core tables + the seam(s) in place, secrets
  wired, CI green, and the `(to define)` architecture gaps resolved + recorded as ADRs.
