---
name: record-learnings
description: >-
  End-of-story/session knowledge sweep for the {{PROJECT_NAME}} project — the net that catches durable
  learnings the in-flight gates missed and routes each to its canonical home. Use it when a story or
  session is wrapping up, or when the user says "record/capture the
  learnings, what should we document, did we miss any docs, reconcile the docs, close the loop,
  end-of-story sweep, update the docs from this session." It reviews the session (cross-checked against
  git) and, for each durable thing learned, decides its home: a decision → ADR, a shortcut →
  TECH-DEBT, an external unknown → OPEN-QUESTIONS, a business/domain fact → CLAUDE.md, an architecture
  change → the ASD, a cross-session fact → memory. It LINKS, never duplicates, and proposes edits for
  approval before applying. It does NOT write the session narrative (that's `handoff`, a separate
  on-demand tool, not an every-story step) and does NOT change PROJECT-STATUS status values (gate-owned
  — it only flags drift). It captures knowledge, it doesn't plan or code.
---

# Record Learnings

The **knowledge net.** The three gates record what they're building *in-flight*, and `handoff` records
the session *narrative* — but durable knowledge still slips through under coding load: a decision that
never became an ADR, a shortcut never logged as debt, an external unknown that surfaced in passing, a
business fact mentioned in conversation, a posture shift, a cost reached. This skill sweeps the whole
session at the close and routes each loose learning to the **one file that owns it** — so the
documentation stays on-point and the next chat starts from a clean sheet.

It is a **catch-all, not a duplicate.** Each canonical file already governs its own format; this skill
decides *what belongs where* and writes it there, **linking** between files rather than copying (a
copied fact is the drift bug the whole system designs against). If the destination already covers a
learning, that's a no-op — say so and move on.

**Where it sits in the lifecycle:** it is the **final step of the routine delivery flow** — `build →
push + PR → review → tech-qa → merge → record-learnings`. `handoff` is **not** part of that routine:
it's a separate, on-demand tool for specific topics (see "Not `handoff`" below), not an every-story
step. *If* you do also write a handoff for the session, run this sweep first so the handoff can link to
the ADR/debt rows it created (see [`CLAUDE.md`](../../../CLAUDE.md) §7).

## What this skill is NOT

- **Not `handoff`.** Handoff writes the session *narrative + open threads* into one journal file, and
  only when a topic is worth resuming later — it's **on-demand, not routine**. This sweep persists
  *durable knowledge* into *many canonical files* and is the routine close of **every** story. If you
  happen to write a handoff too, run this first so it can link to what this filed.
- **Not a gate.** It doesn't review or verify code (`tech-qa`) or plan it (`tech-planning`).
- **Not a status updater.** PROJECT-STATUS status values are owned by the gates. This skill only
  **flags** a status that drifted from reality — it doesn't set it.

## The sweep

1. **Bound the scope.** Take the session conversation since the last sweep / since this story started.
   Anchor it to evidence, not just memory of the chat:
   - `git log --oneline <since>..HEAD` and the diff — what actually changed.
   - Skim the live docs you may touch so you can *point to* them, not restate them.
2. **Sweep & classify.** Walk the session for durable learnings and route each one with the table
   below. For each candidate, also judge: is this a **miss** (a gate *should* have logged it — note
   that, it's a process signal) or genuinely **new**?
3. **Dedupe.** Before proposing an edit, confirm the destination doesn't already cover it. An
   already-recorded learning is a no-op.
4. **Propose, grouped by destination.** Present the proposed edits grouped per file, each tagged with
   its type and miss/new. **CLAUDE.md edits always surface for explicit confirmation** (business truth
   is sensitive). Nothing is written until approved.
5. **Apply on approval**, honoring each destination's own format (the ADR template, the debt columns,
   the open-question row). Link across files; never duplicate.
6. **Close out.** **Commit** the doc changes (the `.githooks/pre-commit` guard backstops status-board
   consistency) — that completes the routine wrap-up. *Only if* this session is a topic worth resuming
   later, reach for `handoff` next to capture the narrative; it's optional, not every story.

## Routing table — what goes where

The heart of the skill. For each learning, find its row; write it in that file's own format (open the
file's header for the exact shape). This table is *process* (where things go), not a copy of the
knowledge itself.

| If the session produced… | It belongs in | In the form of |
|---|---|---|
| An **architecture/technical decision** that was actually made | [`architecture/01-principles-and-decisions.md`](../../../architecture/01-principles-and-decisions.md) | a new **ADR** (Status/Context/Decision/Consequence) |
| A change to **seams, the data model, or a stage-gating trigger** | [`architecture/00-overview.md`](../../../architecture/00-overview.md) (the ASD) | an edit to the relevant section + an ADR if it's a decision |
| A **deliberate shortcut** taken (and not yet logged) | [`TECH-DEBT.md`](../../../TECH-DEBT.md) | a row with the clean target + **paydown trigger** |
| An **unknown that only someone outside the repo can resolve** | [`OPEN-QUESTIONS.md`](../../../OPEN-QUESTIONS.md) | a Q-row (question · blocks · who) — or move one to **Resolved** if an answer arrived |
| A durable **business / domain** fact, or an operating rule | [`CLAUDE.md`](../../../CLAUDE.md) | a precise edit — **always confirm with the user first** |
| A **scope / roadmap** change | [`backlog/`](../../../backlog/) | an epic/story edit (acceptance criteria, sequencing) |
| A **cross-session fact** worth carrying to the next chat (who the user is, feedback, a project constraint, a reference) | the auto-memory store (if the harness has one) | a memory file per the memory rules |
| The **status of an epic/increment** drifted from reality | flag it — route to the owning **gate** | *do not edit status here*; the gates own PROJECT-STATUS |
| The **session narrative / open threads** — *only if the topic is worth resuming later* | [`handoffs/`](../../../handoffs/) | defer to `handoff` — an on-demand tool, not an every-story step |
| *(to define: project-specific homes — add a row for each canonical doc this project keeps beyond the scaffold defaults, e.g. a cost/expenses log, a standing strategic-posture file, an integration-research doc, or an environments/deployment runbook. Map each kind of learning to that file during foundation.)* | — | — |

## Notes

- **A clean no-op is a success.** If the gates and habits already captured everything, say "nothing
  loose — docs are on-point" and stop. The value is in the cases where something slipped.
- **Misses are a signal.** When the sweep finds something a gate should have logged, note it plainly —
  repeated misses in one place mean a gate or habit needs tightening.
- **Skip for trivial exchanges.** A throwaway Q&A or a pure-read session has nothing durable to record.
- **One sweep can run mid-session** after finishing a story, without closing the chat — that's why it's
  separate from `handoff`.
