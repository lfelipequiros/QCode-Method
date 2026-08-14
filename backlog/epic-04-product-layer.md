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

#### Closed: 04.1 — 2026-08-14

Built directly. All acceptance criteria confirmed by direct grep, not assumed: zero Mompa-specific
terms (COO/CMO/PDR numbers/venue names) in the generalized file; "screens" fully replaced by
"surfaces" (checked separately from the filename `screens-map.md`, which correctly stays as-is);
the lifecycle diagram now reads "four gates, product-check first" identically in `CLAUDE.md`, the
scaffolder's own `README.md` template, and the scaffolder `SKILL.md`'s own description; both new
tracker templates exist and are cross-linked.

**A real convention violation found and fixed at self-check, not assumed clean.** The first draft
referenced sibling skills (`tech-planning`, `tech-build`, `tech-qa`, `compass-check`) as plain
backtick mentions throughout — but every other gate template (verified by grepping
`tech-build`/`tech-qa`/`compass-check`'s own actual link syntax) uses real markdown links for these
cross-references, both for house-style consistency and because a real link gets checked by
`check-links.mjs` once it runs for real, where a backtick mention doesn't. Fixed the structural
mentions (the lifecycle-diagram intro, both "vs. X" section headers, the final hand-off line) to
real links; re-verified via `grep -oE ']\([^)]+\)'` that all four sibling-skill links now resolve to
the correct relative paths.

**The follow-up edit promised in this story's own acceptance criteria was done, not deferred
again.** 03.4 left `record-learnings`' product-surface routing row as `(to define)` specifically
because `product/decisions.md` and `product/screens-map.md` didn't exist yet. Now that this story
creates them, the row was updated to link both files directly rather than leaving the placeholder in
place — a `(to define)` gap that could be resolved in the same story that removes its own precondition
is resolved, not carried forward to look tidy in a different story's diff.

**Also fixed:** the `filling-the-gaps.md` "note on the gates" still said "the three gate skills" and
"revisit the three gate skills" — updated for the fourth, and added a paragraph explaining
`product-check`'s different shape (fully generic except one token, with a real skip path when
`{{PRODUCT_CONSUMERS}}` is "n/a" rather than dead ceremony on a library/pipeline project).

**Epic 04 closes with this story** — it was always scoped as a single story. Every forward reference
the epic-03 gates carried to `product-check` (`skills-lock.json` aside, which is 06.2's own promise)
is now resolved: `compass-check` and `record-learnings` both point at real files, not placeholders.
