# Epic 04 — The product layer

**Goal.** Ship a generalized `product-check` as a core, always-installed gate ahead of
`tech-planning`, with its own PDR log and surface map — closing the one whole category of gate
QCode has never had.

**Value archetype.** Extraction — Mompa runs 310 lines of upstream product discipline; QCode has
none. Since the interview decided this ships core (not optional), the lifecycle becomes
`product-check → tech-planning → tech-build → tech-qa` for every scaffolded project.

**Depends on.** Epic 03 (the lifecycle diagram and hand-off language this cites live in the gates
this epic points at).

**Reference.** The extraction plan, theme T6; composition finding C9.

---

## Stories

### 04.1 — Generalize `product-check` + its trackers

**What & why.** Port the upstream gate — interview to sharpen a vague ask, check the backlog for
duplication, a surface-consistency check, an edge-case checklist, prioritization deferring to
`compass-check`'s scorecard, and an explicitly-invoked audit mode — with every Mompa-specific
citation replaced by a generic instruction.

**This increment.**
- Skill template: replace named roles ("COO, CMO, an operator") with `{{PRODUCT_CONSUMERS}}";
  "screens" with "surfaces" throughout; every `PDR-00x` citation with a generic
  "cite the relevant PDR" instruction.
- Keep intact, because they're already fully generic: the interview questions (who
  reads/acts on this, what decision it drives, which surface or is this new, what's explicitly out
  of scope), the edge-case checklist (empty/zero-data · no permission · partial data · multi-tenant
  · reused terms · surface-job fit · who acts), the gatekeeping posture (push back, never
  hard-block — severity changes how long you push, not whether you yield; an overridden concern
  stays visible inline in the story), and audit mode (six-check reverse reconciliation, punch list,
  never auto-fix).
- New templates: `product/decisions.md` (the PDR log, house Decision/Context/Consequence shape,
  with an "Owed" section for PDRs known to be needed but not yet settled) and
  `product/screens-map.md` (one line per surface, "what it's for," maintained by this skill).
- Story template mirrors `tech-planning`'s shape with the architecture-heavy fields left as
  explicit `_Awaiting tech-planning pass._` placeholders, so the two gates read as one continuous
  document.
- Update the lifecycle diagram everywhere it's stated: the scaffolder's own description, the
  generated `README.md`, `CLAUDE.md` §7 (now product-check → tech-planning → tech-build → tech-qa),
  and every gate's own cross-reference to "what runs before/after me."
- **Fix C9** — this skill becomes the sole owner of `product/screens-map.md` and
  `product/decisions.md`, and the sole filer of a `raised` story (superseding any implication that
  `compass-check` files one itself).
- Interview gains a question: who consumes the product surfaces (`{{PRODUCT_CONSUMERS}}`) — for a
  library or pipeline with no user-facing surface, this can resolve to "n/a, skip product-check
  per-story" without removing the skill from the scaffold.

**Acceptance criteria.**
- No occurrence of a Mompa-specific PDR number, screen name, or role remains in the generalized
  file.
- The lifecycle diagram reads identically (four gates, product-check first) everywhere it's
  restated.
- `product/decisions.md` and `product/screens-map.md` templates exist and are cross-linked from
  the generalized skill.
- `record-learnings` (03.4) can now have its `(to define)` PDR/surface-map routing row filled in —
  tracked as a follow-up edit to that story, not a new one.

#### Closed: 04.1

_Filled in once the subagent pass is QA'd and lands._
