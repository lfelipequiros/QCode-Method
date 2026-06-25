# Handoff — 2026-06-25 — QCode-Method: framework completion, adoption & handoff decoupling

**Topics:** framework, scaffolder, qcode-sync, adoption, versioning, skills, handoff-decoupling
**Repo at:** `1aaba25` (main, pushed to `git@github.com:lfelipequiros/QCode-Method.git`)
**Live state:** this repo has no `PROJECT-STATUS.md` (it's a pure framework library, not an app) — the
"current state" is [`README.md`](../README.md), [`VERSION`](../VERSION) (now **1.0.1**), and
[`docs/updating-projects.md`](../docs/updating-projects.md).
**Lineage:** this framework descends from the **pips-project-scaffolder** built on the Mompa/Finosonido
platform — its origin handoff is `Finosonido - CTO/handoffs/mompas-handoffs/2026-06-18-pips-project-scaffolder.md`
(read it for the original two-tier `{{token}}`/`(to define)` design rationale).

The session that took **QCode-Method** from a half-built partial copy (a dead session left ~21 templates
+ a renamed scaffolder, not a git repo) to a **complete, pushed, self-updating framework v1.0.1**, then
**adopted it onto Finosonido** (the donor it was generalized from) without losing anything, and finally
**fixed a conceptual flaw** where `handoff` was wrongly coupled to every story's wrap-up.

## What this session did (the arc)

1. **Recovered context.** Loaded the four `mompas-handoffs` (SDLC scaffolding, build-cockpit,
   compass-check, pips-project-scaffolder) and found the QCode repo with partial, uncommitted work.
2. **Completed the framework → v1.0.0** (`922e402`):
   - **Audited** every template against the canonical Finosonido source skills — confirmed faithful
     generalizations, zero domain leakage.
   - **Filled 3 missing templates** the scaffolder's `SKILL.md` promised but didn't ship: `env.example`,
     `skills/compass-check/SKILL.md`, `skills/compass-check/business-context.md`.
   - **Fixed two real bugs:** VERSION lived only at repo root but the scaffolder reads it "in this skill
     folder" (broke the copy-the-folder flow) → added a VERSION inside the skill folder; and
     `backlog/00-roadmap.md` used an **undeclared `{{EPIC_TABLE_ROADMAP}}` token** → declared it in the
     token list + interview.
   - **Built the update mechanism:** `scripts/qcode-sync.mjs` + `docs/updating-projects.md`.
   - **Wrote** the framework `README.md`, `.gitignore`, `.gitattributes`; `git init` + first push.
   - **Verified end-to-end** by smoke test: scaffold render (0 leftover tokens, 25 files) → cockpit
     parses the generated board/backlog → qcode-sync round-trips clean and detects+applies drift.
3. **Hardened sync for existing/donor projects + adopted Finosonido** (`cd7a24a`):
   - Added a **`customized` list** (+ `--force`) to `qcode-sync`: framework-owned files a project has
     enriched beyond the generic base are **review-only**, never overwritten without `--force`.
   - **Adopted Finosonido** by adding only `Finosonido/.qcode/config.json` (the donor case — its
     `record-learnings` and `compass-check` are *richer* than the generic templates). Verified: dry-run
     reports **4 files up-to-date, 5 customized (review), 0 writes** — nothing of Finosonido's lost.
4. **Decoupled `handoff` from the per-story flow → v1.0.1** (`1aaba25`):
   - The flaw: the delivery flow read `… → record-learnings → handoff`, framing a handoff as mandatory
     every story. Fixed across **CLAUDE.md §7, record-learnings, and handoff** (both the QCode templates
     *and* Finosonido): the routine flow now **ends at `record-learnings`**; `handoff` is a deliberate,
     **on-demand** tool for a specific topic worth resuming. (This very handoff is that tool used right.)

## Decisions (meta-tooling, recorded here — QCode has no ADR log of its own yet)

- **Repo shape = pure framework library.** No live gates/board/cockpit at the QCode root; it's the
  source you scaffold *from*, not a project itself. (Felipe's choice.)
- **Audit-then-complete**, not rebuild — the partial work was sound, just incomplete.
- **VERSION:** canonical copy lives **inside the scaffolder folder** (so it travels when the folder is
  copied standalone); repo-root `/VERSION` mirrors it; a release bumps both; `qcode-sync` warns on drift.
- **qcode-sync model:** diff-first, dry-run by default, backup-on-write (`.qcode-bak`), preserves the
  cockpit's `LAYERS`; a clear **framework-owned vs project-owned** split; **`customized`** protects
  enriched files. Skips any file whose tokens aren't in `config.json` rather than writing it half-rendered.
- **Finosonido adoption = consumer with protected enrichments.** Its 5 richer skill files
  (`tech-planning/build/qa` cosmetic-only + `record-learnings`/`compass-check` genuinely enriched) are
  listed `customized` so sync shows their diffs but never flattens them.
- **`handoff` is on-demand, not a per-story step.** record-learnings is the routine close; handoff is for
  specific resumable topics (v1.0.1).

## Repo changes

- **QCode-Method (`main`):** `922e402` v1.0.0 framework complete · `cd7a24a` qcode-sync customized
  protection + adoption docs · `1aaba25` v1.0.1 handoff decoupling. All pushed.
- **Finosonido (`develop`):** `cdb89a1` adopt framework (`.qcode/config.json`) · `09fb6b9` handoff
  decoupling mirror. (Cross-repo, for the record — not this repo's history.)

## Open threads / resume here (the framework's backlog)

- **Never run on a real new project.** The scaffolder's interview→generate path was only smoke-tested
  programmatically; a real first scaffold (with the interview) will expose rough edges. *This is the
  top thing to do next.* (Carried from the pips handoff.)
- **Trigger-optimization never run** on the QCode skills — even more skills can now compete to fire.
- **No release script** keeps the two VERSION files in sync (sync only *warns* on mismatch). A tiny
  `npm run release`-style bump would close it.
- **qcode-sync diff output is noisy** — it prints raw `git diff --no-index` temp paths. Functional but
  ugly; worth a cleaner unified-diff formatter.
- **Donut not yet eaten:** Finosonido's 5 `customized` skills will need a **manual hand-port** the first
  time the framework's generic versions genuinely improve — the workflow is documented but unexercised
  on a real divergence.
- **Distribution is still "copy the folder."** Package as a `.skill` only if real portability matters.
- **Should QCode eventually dogfood its own SDLC?** Currently a pure library; revisit if the framework's
  own development gets complex enough to want gates/a board (this handoffs/ journal is the first step).

## To resume, load

- [`README.md`](../README.md) (what QCode is + scaffold/update flows) · [`VERSION`](../VERSION) ·
  [`docs/updating-projects.md`](../docs/updating-projects.md) (the qcode-sync + adoption model).
- The scaffolder: [`.claude/skills/qcode-project-scaffolder/SKILL.md`](../.claude/skills/qcode-project-scaffolder/SKILL.md)
  + [`references/filling-the-gaps.md`](../.claude/skills/qcode-project-scaffolder/references/filling-the-gaps.md).
- The updater: [`scripts/qcode-sync.mjs`](../scripts/qcode-sync.mjs).
- Lineage/origin: the four `mompas-handoffs` in the Finosonido repo (esp. `2026-06-18-pips-project-scaffolder.md`).
