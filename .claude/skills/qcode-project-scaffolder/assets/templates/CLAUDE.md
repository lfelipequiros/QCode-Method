# {{PROJECT_NAME}} — Project Instructions

> Orientation document for any Claude instance working in this repo.
> Read this first. It defines what we're building, how we decide, and how to operate.

---

## 1. What {{PROJECT_NAME}} Is

{{ONE_LINER}}

{{DOMAIN_SUMMARY}}

---

## 2. Operating Context

- **Team:** {{TEAM_CONTEXT}}. Scope and sequencing must respect this bandwidth — prefer fewer,
  higher-leverage builds over broad surface area.
- **Tenancy:** {{TENANCY}}. *(If multi-tenant: every data model is tenant-aware from day one, even if
  one tenant is onboarded at a time.)*

---

## 3. Value Model (why we build anything)

Every candidate feature, integration, or stack choice must be justifiable against **at least one**
value archetype. If it can't, it waits.

{{VALUE_ARCHETYPES}}

Secondary value (better decisions, momentum) is real but should be tied back to an archetype wherever
possible to keep priorities honest.

---

## 4. Decision Principles

**Evaluation axes for any tool / stack / app decision** (the north star):
**{{DECISION_AXES}}.** Nothing is dogma — everything can be analyzed and changed if the axes point
elsewhere.

**Integrate before you build.** Default to integrating or improving existing tools. Build a
replacement only when a system is (a) causing real problems, (b) costly, **and** (c) plausibly easy
to replace — judged by the axes above.

**Stage-gated architecture.** Introduce complexity (a warehouse, a queue, streaming, agents) only when
product reality justifies it — when a named trigger fires *(to define: the stage-gating triggers —
list them in `architecture/00-overview.md` during foundation)*. Premature complexity before
product-market fit is a failure mode.

**Plan before code.** Present a plan and receive **explicit approval** before writing or modifying
code. Act as a senior architect/analyst: structured analysis first, recommendations second,
implementation only after approval.

---

## 5. Tech & Architecture

- **Hosting / serverless:** {{STACK_HOSTING}}
- **Frontend:** {{STACK_FRONTEND}}
- **Backend:** {{STACK_BACKEND}}
- **Data store:** {{STACK_DATA}}
- **AI:** {{STACK_AI}}
- **Data-access seam:** {{ACCESS_LAYER}}

**Architecture overview:** {{ARCHITECTURE_OVERVIEW}}

*(to define: the project's stable seams/interfaces and core data model — settle in
`architecture/` during foundation and record each decision as an ADR.)*

---

## 6. House Engineering Standards

{{HOUSE_STANDARDS}}

- Typed result wrapper `{{TYPED_RESULT_NAME}}` for service-layer returns.
- Schema validation at every external boundary.
- Strict types across the repo.
- Structured / prefixed logs for readability.
- **No schema change without the corresponding data-access update** in the same change set.

---

## 7. How Claude Should Operate in This Project

- **Senior architect/analyst posture:** analysis → recommendation → (approval) → implementation.
- **Plan-first discipline & the three-gate lifecycle:** never write/modify code without an approved
  plan. Three skills enforce one lifecycle:
  - **`tech-planning`** (plan) — before any code, turns the task into an approved backlog story
    (architecture-aligned, value archetype named, target → increment → path-to-target explicit).
  - **`tech-build`** (build) — implements *only* the approved increment, holds the invariants, runs a
    divergence protocol so code never silently drifts from the plan.
  - **`tech-qa`** (prove it's done-done) — the independent pass: compliance review + results
    verification against the story's acceptance criteria, before anything merges or ships.
- **The status board is the single status surface.** [`PROJECT-STATUS.md`](PROJECT-STATUS.md) owns
  status (zero duplication), updated in the same commit as the work. A `.githooks/pre-commit` guard
  backstops it.
- **Decisions → ADRs** ([`architecture/01-principles-and-decisions.md`](architecture/01-principles-and-decisions.md));
  **deliberate shortcuts → [`TECH-DEBT.md`](TECH-DEBT.md)** (each with a paydown trigger);
  **external blockers → [`OPEN-QUESTIONS.md`](OPEN-QUESTIONS.md)**; **sessions → `handoffs/`**.
- **Close the knowledge loop (the learnings sweep).** At the end of a story or session — *before*
  writing the handoff — run **`record-learnings`** to sweep the session for durable knowledge the
  in-flight gates missed and route each to its canonical home (a decision → ADR, a shortcut →
  TECH-DEBT, an external unknown → OPEN-QUESTIONS, a business/domain fact → this file, an architecture
  change → the ASD, a cross-session fact → memory). The sweep *links*, never duplicates; the handoff
  then captures the narrative on top: build → … → tech-qa → merge → **record-learnings → handoff**.
- **Value lens always on:** when proposing anything, name which value archetype it serves.

---

## 8. Constraints & Prohibitions

- **No new infrastructure** until its stage-gating trigger fires.
- **No schema changes** without corresponding data-access updates.
- **No code without an approved plan.**
- *(to define: project-specific prohibitions — add during foundation.)*
