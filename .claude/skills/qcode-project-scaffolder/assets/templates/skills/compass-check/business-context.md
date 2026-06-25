# Business Context — {{OWNER_NAME}} / {{PROJECT_NAME}}

Standing strategic **posture** for the [`compass-check`](SKILL.md) skill — the working context that lets
it advise like a CTO who knows the project. It holds **only what isn't written elsewhere**; for the
actual project knowledge it **points to the reference files we own** (below) instead of copying them,
so there is one source of truth and nothing drifts.

> `(to fill)` = compass-check should ask when it would change a recommendation. Keep this short and
> current; delete stale lines rather than letting them rot. **Never duplicate business logic here** —
> if a fact lives in CLAUDE.md / backlog / architecture, link it; only posture with no other home
> belongs in this file.

---

## Where the project knowledge lives (read these — don't restate them here)

Compass's job is to *synthesize* these, not to hold a copy of them:

- **What {{PROJECT_NAME}} is, the value model, and the priorities** → **CLAUDE.md** (always loaded by
  the harness): the domain (§1), the value archetypes (§3), the decision principles (§4).
- **The plan and delivery sequence** → `backlog/00-roadmap.md` and the epic files.
- **Architecture, decisions, environments** → `architecture/` (the ASD + ADRs).
- **Live status / the next move** → `PROJECT-STATUS.md`. **External blockers** → `OPEN-QUESTIONS.md`.
  **Deliberate shortcuts** → `TECH-DEBT.md`.
- *(to define: any project-specific source-of-truth docs — e.g. a cost/expenses log, a raw
  requirements doc, an integrations-research file. Add a pointer here during foundation.)*

---

## Posture that lives only here (compass-owned — no other home)

> Fill these during foundation, or leave them `(to fill)` — compass-check will ask when a missing
> field would change a recommendation, and offer to record the answer here.

### Weekly bandwidth
- Who builds it: {{TEAM_CONTEXT}}.
- Build capacity (hours/week, standard increment size): `(to fill)`

### Runway / financial posture
- Spend appetite for infra/tools: `(to fill)`
- Cost sensitivity vs. speed right now: `(to fill)`

### Deadlines / external timing
- Hard external dates (demo, launch, commitment): `(to fill)`

### Risk appetite
- Default: **stage-gated** — avoid premature complexity; integrate before building (CLAUDE.md §4).
- Project-specific overrides (e.g. a live-business reliability floor that outranks the anti-over-build
  reflex): `(to fill)`
- Polish-vs-speed for v1 work: `(to fill)`

### Known failure modes (where this project tends to slip — and the guardrail)
compass-check checks these before recommending; seed from real evidence, grows over time.

- **Over-building the foundation** — enablers pay no rent. *Guardrail:* keep it skeletal — thinnest
  correct slice.
- **Skipping baseline capture** — capture the before-state while it's still observable.
- **Secret leakage** — `.gitignore` covers `.env*` / `credentials/`; per-environment secrets
  server-side; prod-only keys never in non-prod.
- **Doc / status drift** — the `.githooks/pre-commit` (+ CI) status-board guard; update PROJECT-STATUS
  in the same commit. *(This file is itself a drift risk — keep it pointers, not copies.)*
- **Scope creep inside a session** — name the growth, lock the spec, ship the agreed slice.
- *(to define: add the failure modes specific to this owner/team as they surface.)*
