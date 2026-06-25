# Handoffs

Point-in-time summaries of work sessions, so a new chat can resume **without replaying the whole
transcript** — keeping context windows small. Written and loaded by the
[`handoff`](../.claude/skills/handoff/SKILL.md) skill.

- **What a handoff is:** the conversational layer the repo can't hold — narrative, decisions
  (linked), repo changes, and "resume here." It **links** to live state; it never copies it.
- **What it isn't:** current status. That's always [`PROJECT-STATUS.md`](../PROJECT-STATUS.md).
  Handoffs are *history*; the board is *now*.
- **To resume:** ask to "load the handoff for `<topic>`." The skill reads it and reconciles it against
  the current board + git history before briefing you, so a slightly-stale handoff is safe.

## Index

| Date | Handoff | Topics | Summary |
|------|---------|--------|---------|
| — | *(first handoff lands here when you write one)* | — | — |
