# Handoffs — QCode-Method development journal

Point-in-time summaries of sessions that **build or maintain the framework itself**, so a new chat can
resume without replaying the whole transcript.

- **What a handoff is:** the conversational layer the repo can't hold — narrative, decisions, repo
  changes (by commit), and "resume here." It **links** to live state; it never copies it.
- **What it isn't:** current state. This repo's "now" is [`README.md`](../README.md),
  [`VERSION`](../VERSION), and [`docs/updating-projects.md`](../docs/updating-projects.md).
- **On-demand, not per-session.** Per the framework's own rule (v1.0.1), write a handoff only when a
  session is a topic worth resuming — not as routine. This journal is for the framework's evolution.
- **To resume:** read the relevant handoff below; it reconciles against the current `VERSION` + git log.

## Index

| Date | Handoff | Topics | Summary |
|------|---------|--------|---------|
| 2026-06-25 | [QCode-Method bootstrap & adoption](2026-06-25-qcode-method-bootstrap-and-adoption.md) | framework, scaffolder, qcode-sync, adoption, versioning, handoff-decoupling | Completed the framework from a partial copy → **v1.0.0** (filled 3 missing templates, fixed VERSION + token bugs, built `qcode-sync` + docs, pushed); hardened sync with `customized`-file protection and **adopted Finosonido** (donor case, zero loss); then **decoupled `handoff` from the per-story flow → v1.0.1**. Origin lineage: the four `mompas-handoffs` in the Finosonido repo. |
