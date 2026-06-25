---
name: handoff
description: >-
  Session handoff for the {{PROJECT_NAME}} project — write a durable summary of a work session, or
  load a past one to resume in a fresh chat without replaying the transcript. Use WRITE mode
  deliberately — when you're pausing or closing a *specific topic/thread worth resuming later*, or when
  the user says "write a handoff / summarize this session / wrap up / I'm closing this chat / hand off."
  It is ON-DEMAND, not an automatic per-story step (routine story wrap-up is `record-learnings`). Use
  LOAD mode at the start of a new chat or when the user says "load
  the handoff / resume / catch me up / where did we leave off / what were we doing on X." A handoff
  captures the session NARRATIVE, decisions (linked to where they landed), repo changes (commit
  hashes), and open threads — never a copy of live state (that's PROJECT-STATUS / TECH-DEBT / ADRs,
  which it links to). On load it reconciles the handoff against the current board and git history so a
  stale handoff is still safe. Trigger for any "summarize/save this conversation" or "pick up where we
  left off" request, even if the word "handoff" isn't used.
---

# Handoff

The bridge between a closed chat and a new one. The repo already holds **state**
([`PROJECT-STATUS.md`](../../../PROJECT-STATUS.md)), **decisions** (ADRs), **the plan** (backlog/ASD),
and **what changed** (git). What it can't hold is the **conversational layer** — the reasoning
in-flight, the open threads, and where the cursor was when you stopped. A handoff captures exactly
that, so a fresh chat bootstraps from a small, bounded context instead of a giant transcript.

Handoffs are a **journal**: append-only and point-in-time — polish freely *during* the session that
writes one, but don't rewrite it in a *later* session (that's history). They **link** to the live
docs; they never duplicate them (a copied status line is the drift bug we design against).

Two modes — pick by what the user is doing.

## WRITE mode — capture this session

Triggers: "write a handoff," "summarize this session," "wrap up," "I'm closing this chat."

1. **Summarize the session** honestly: what we did, what we decided, what changed. Narrative, not a
   transcript dump.
2. **Cross-reference the repo** so the handoff is anchored:
   - `git rev-parse --short HEAD` → the commit the handoff describes.
   - `git log --oneline` → commits made this session.
   - Skim [`PROJECT-STATUS.md`](../../../PROJECT-STATUS.md) for the state to *point to*.
3. **Write `handoffs/YYYY-MM-DD-slug.md`** using the template below. Link decisions to where they
   landed (ADRs/docs); list repo changes by commit; be concrete about **open threads / resume-here**.
   Do **not** restate status, debt, or decisions — link to them.
4. **Update the index** [`handoffs/README.md`](../../../handoffs/README.md): add a row with date,
   title, **topic tags**, and a one-line summary.
5. **Remind the user to commit** the handoff + index.

## LOAD mode — resume in a new chat

Triggers: "load the handoff," "resume," "catch me up," "what were we doing on <topic>."

1. **Pick the handoff** — by date, title, or topic tag from
   [`handoffs/README.md`](../../../handoffs/README.md). If the user names a topic, load every handoff
   tagged with it (newest first).
2. **Read it.**
3. **Reconcile against reality** — this is the point, because a handoff is a snapshot:
   - Read current [`PROJECT-STATUS.md`](../../../PROJECT-STATUS.md).
   - `git log <handoff-commit>..HEAD --oneline` → what changed since the handoff.
   - Flag divergences plainly ("the handoff planned X; the board now shows it `done`").
4. **Brief the user**: where we left off · what's changed since · where to resume. Then load only the
   specific live docs the handoff points to — not the whole repo.

## Handoff template

```markdown
# Handoff — <YYYY-MM-DD> — <Title>

**Topics:** <comma-separated tags>
**Repo at:** <short commit hash> (<branch>)
**Live state:** see [PROJECT-STATUS.md](../PROJECT-STATUS.md) — not duplicated here.

## What this session did
- <narrative bullets>

## Decisions (and where they landed)
- <decision> → <link to the ADR/doc that records it>

## Repo changes
- <commit hash> — <subject>

## Open threads / resume here
- <what's next, what was left mid-flight, what to pick up first>

## To resume, load
- <the few live docs/skills relevant to continue> (links)
```

## Notes

- **One handoff per session**, dated. If a session spans many topics, tag them all.
- **Don't let handoffs rot into a second source of truth.** They're history. Current state is always
  `PROJECT-STATUS`; a handoff tells you the story and where to look.
- **Not every story needs a handoff.** The routine end-of-story wrap-up is `record-learnings` (it runs
  every time). Reach for a handoff only when there's a narrative thread worth carrying into a future
  chat — a specific topic you'll resume. Skip it for trivial one-off exchanges.
