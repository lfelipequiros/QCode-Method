# Epic 06 — Assembly & release

**Goal.** Absorb everything epics 02–05 produced into `CLAUDE.md`, close the composition gap
around the wrap-up sequence, update every doc that describes the framework, and cut v2.0.0 behind
a real end-to-end acceptance test.

**Value archetype.** Enabler — nothing here is new capability; it's the assembly step that makes
epics 02–05 into one coherent, documented, releasable thing.

**Depends on.** Epics 03, 04, 05 (this absorbs their output).

**Reference.** The extraction plan, theme T7 (operating-doc evolution); composition finding C8;
section 08 (risks & decisions, all closed).

---

## Stories

### 06.1 — `CLAUDE.md` template rewrite

**What & why.** Fold in every operating-doc lesson from Mompa's own `CLAUDE.md` evolution, merged
with — not replacing — the existing §7 token-discipline section from v1.0.2.

**This increment.**
- **§0 — nested `CLAUDE.md` precedence** for multi-app workspaces: the app-level file wins for
  that app's internals, the root wins for cross-app strategy, conflicts get *surfaced* rather than
  silently resolved, reusable patterns *flow up*. Shipped as a conditional section (only relevant
  once a project has more than one app).
- **House standards as a lessons ledger** — the *pattern* and the instruction ("a standard earns
  its place by citing the incident that bought it"), not any of Mompa's own entries.
- **Supersession/cleanup rule** — a story that supersedes another closes it in the same pass, with
  both named failure modes (closing by assumption; closing by omission) and a
  `#### 🧹 Cleanup on close` block that `tech-qa` walks before merging.
- **Repo-only memory** + the full surface-routing table (status / plan / shortcuts / blockers /
  decisions / product / operating rules / narrative), each to its committed home — per the
  repo-only decision, no row points at the harness memory store.
- **Session-close traceability checklist** and **self-serve before declaring blocked** (only a
  semantics call genuinely needs a human; a vendor's data shape usually doesn't).
- The full delivery contract (branch-per-story, single PR, tech-qa-only-merges,
  planning-only-to-main exception) stated once here; every gate's own `SKILL.md` states only the
  *procedure* it executes, cross-referencing this section rather than restating the contract.
- **Fix C8** — states the canonical wrap-up sequence exactly once:
  `product-check → tech-planning → tech-build → PR → tech-qa → merge → record-learnings`, with
  `handoff` explicitly marked off that spine (opt-in, not routine). Every skill template links to
  this section instead of restating the order in its own words.

**Acceptance criteria.**
- The delivery contract appears in full in exactly one place (`CLAUDE.md`); every gate template
  that used to restate it now links instead.
- The wrap-up sequence is stated as one unambiguous chain, with `handoff`'s opt-in status called
  out explicitly.
- No routing-table row in the memory section points at an external memory store.

### 06.2 — Docs, tokens, skills-lock, release, acceptance

**What & why.** Everything that has to be true for v2.0.0 to be a real, working release rather
than a pile of correct-in-isolation files.

**This increment.**
- `README.md` rewrite: four gates (product-check leads), the two-stage bootstrap (scaffold →
  charter), the engine's four modes.
- `docs/updating-projects.md` gains the v1→v2 migration path (pointing at `migrate` mode, 05.4).
- `references/filling-the-gaps.md`: new tokens (`{{CLAUDE_PLAN}}` already added in v1.0.2,
  `{{REPO_HOST}}`, `{{PRODUCT_CONSUMERS}}`), a revised gap checklist, and the documented
  reservation of **epic 08** for the ad-hoc bucket (a project with more than eight named epics
  must number around it — previously undocumented).
- `VERSION` → **2.0.0** at both the framework root and inside the scaffolder skill folder.
- Ship `skills-lock.json` declaring `architecture` (source, path, hash) as a recommended
  prerequisite — what `compass-check`'s leverage lens reads, and what would catch the vendor skill
  drifting upstream.
- Document clone-and-run as the install path (`git clone` + `node qcode.mjs generate ../new-project`).
  File packaging (`npx`-able, published package) as **deferred**, on this same backlog, with its
  trigger named: *"a second person, or a second machine, needs to scaffold a project."*
- **Run the day-one acceptance test end to end** — this is the release gate, not a nice-to-have:
  `generate` into a scratch repo → zero unresolved tokens, `board:check` 0, `check:links` green,
  cockpit renders → first commit succeeds with hooks active → `sync` reports zero diffs
  (idempotent) → `check` reports structurally valid with the honest open-gap count.

**Acceptance criteria.**
- Both `VERSION` files read `2.0.0`.
- The acceptance test sequence above runs clean, in order, on a real scratch directory — not
  simulated or described.
- `skills-lock.json` exists and validates against the same hash format Mompa's uses.
- The packaging deferral is written down with its trigger, not left as a silent gap.

#### Closed: 06.1–06.2

_Filled in as each story's subagent pass is QA'd and lands._
