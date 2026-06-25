# Filling the gaps

How the two kinds of blanks in the templates get resolved — at interview time and at foundation time.
Read this before generating, and hand the **gap checklist** (bottom) to the new project's team.

## Two kinds of blank

### 1. `{{TOKEN}}` — resolved now, from the interview

Substitute every occurrence at generation time. Full list:

| Token | Meaning | Default if user has none |
|---|---|---|
| `{{PROJECT_NAME}}` | Display name | — (required) |
| `{{PROJECT_SLUG}}` | kebab-case id (package names, ids) | derived from name |
| `{{ONE_LINER}}` | One-sentence "what it is" | — (required) |
| `{{DOMAIN_SUMMARY}}` | A short paragraph: what it does, for whom | — (required) |
| `{{TEAM_CONTEXT}}` | Who builds it / consumes it | "solo developer" |
| `{{OWNER_NAME}}` | Who holds the wheel (used by compass-check) | "the owner" |
| `{{TODAY}}` | ISO date at generation time | — (runner-supplied) |
| `{{FRAMEWORK_VERSION}}` | QCode-Method version stamped into `.qcode/config.json` | read from the skill's `VERSION` file |
| `{{VALUE_ARCHETYPES}}` | 1–3 ways it creates value (generalized ROI) | "replace/avoid a cost · prevent a loss · enable downstream value" |
| `{{DECISION_AXES}}` | The axes every tool/stack choice is judged on | "Confidence · Time-to-market · Reliability · ROI" |
| `{{STACK_HOSTING}}` / `{{STACK_FRONTEND}}` / `{{STACK_BACKEND}}` / `{{STACK_DATA}}` / `{{STACK_AI}}` | Stack pieces | "(none)" where N/A |
| `{{TENANCY}}` | Tenant key name, or single-tenant | "single-tenant" |
| `{{TYPED_RESULT_NAME}}` | Service-boundary result type | `Result<T>` |
| `{{ACCESS_LAYER}}` | Typed data-access package name | `@{{PROJECT_SLUG}}/data` or "n/a" |
| `{{HOUSE_STANDARDS}}` | The engineering non-negotiables | the default list in SKILL.md Step 1.6 |
| `{{ARCHITECTURE_OVERVIEW}}` | The layers + seams, if known | else becomes a `(to define)` gap |
| `{{EPIC_TABLE}}` | Extra **board** rows for `PROJECT-STATUS.md` (columns: `# / Epic / Status / Detail`), one per epic beyond Foundation | empty (Foundation only) |
| `{{EPIC_TABLE_ROADMAP}}` | Extra **roadmap** rows for `backlog/00-roadmap.md` (columns: `# / Epic / Outcome / Value archetype / Depends on`), one per epic beyond Foundation — same epics as `{{EPIC_TABLE}}`, different columns | empty (Foundation only) |

### 2. `(to define: <what> — <how/when>)` — resolved later, during foundation

These are decisions that need real project context the interview can't supply. **Leave them verbatim**
in the generated files. Each is a deliberate, instructed invitation to decide during Epic 01
(Foundation) or the first epic that touches it. They are *meant* to be visible — a marked blank the
team fills on purpose beats an assumption silently inherited from another project's domain.

The two lifecycle skills are built to surface them: `tech-planning`'s alignment checklist will flag
an unresolved `(to define)` in an area a story touches, and the architecture ADR log is where the
resolution gets recorded.

## Gap checklist (what the new project resolves during foundation)

Hand this to the team. Each item is a `(to define)` gap that ships in the generated scaffold:

- **Architecture seams** — what are this project's stable interfaces (e.g. a data-access seam, an
  external-provider adapter seam)? Define in `architecture/00-overview.md` and record the decision
  as an ADR in `architecture/01-principles-and-decisions.md`.
- **Canonical / core data model** — the central entities and their tenant scoping. `architecture/`.
- **Tenancy mechanism** (if multi-tenant) — how the tenant key is enforced (row-level security? a
  filter in the access layer?). ADR it.
- **Data-access contract** (`{{ACCESS_LAYER}}`) — the typed read surface consumers depend on, if any.
- **Stage-gating triggers** — the specific conditions under which you'll add heavier infrastructure
  (a queue, streaming, a cache, agents). Until a trigger fires, you don't build it. List them in
  `architecture/00-overview.md`.
- **House-standard specifics** — the exact shape of `{{TYPED_RESULT_NAME}}`, the validation library,
  the lint/test tooling. Settle in Epic 01 and document in `CLAUDE.md`.
- **Cockpit view** — the cockpit renders an epic-based progress view out of the box. If the project
  wants the *architecture-layer* view instead, fill the `(to define)` `LAYERS` config at the top of
  `cockpit/generate.mjs` (map each layer to the epics that build it).
- **CI status guard** — the generated `.githooks/pre-commit` is the *local* guard; add an
  un-bypassable server-side equivalent in CI as an Epic 01 story (it can't be enforced by a template).
- **`record-learnings` routing table** — the generated skill ships with the scaffold-default
  destinations (ADR, ASD, TECH-DEBT, OPEN-QUESTIONS, CLAUDE.md, backlog, memory, handoff). Its table
  carries one `(to define)` row: add a routing row for each canonical doc this project keeps *beyond*
  the defaults (e.g. a cost/expenses log, a standing strategic-posture file, an integration-research or
  environments runbook), mapping each kind of learning to that file during foundation.
- **compass-check `business-context.md`** (only if the optional advisor was installed) — fill its
  standing-posture fields (bandwidth, runway, deadlines, risk appetite, known failure modes) during
  foundation, or leave them: compass-check asks when a missing fact would change a recommendation.

## A note on the gates

`tech-planning`, `tech-build`, and `tech-qa` carry the most reference-platform-shaped wording. Their
*structure* (plan→build→qa, target/increment/path, the divergence protocol, the two-phase QA) is
universal and ships intact. Their *invariants* (the seam checks, the tenant key + access policies, the
typed result wrapper + boundary validation) are parameterized by `{{HOUSE_STANDARDS}}` /
`{{ACCESS_LAYER}}` / `{{TENANCY}}` tokens plus `(to define)` gaps for the architecture-specific checks.
After foundation resolves those gaps, revisit the three gate skills once and replace any remaining
`(to define)` in their alignment checklists with the project's now-real invariants — a five-minute pass
that makes the gates bite.
