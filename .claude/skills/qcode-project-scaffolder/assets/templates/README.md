# {{PROJECT_NAME}}

{{ONE_LINER}}

{{DOMAIN_SUMMARY}}

## Where things live

This repo is run with a plan-first, single-source-of-truth operating system. Start here:

- **[CLAUDE.md](CLAUDE.md)** — orientation: what we're building, how we decide, how to operate.
- **[PROJECT-STATUS.md](PROJECT-STATUS.md)** — the live status board. **Read it first to know where
  things stand.** It owns status; it links to everything else.
- **[architecture/](architecture/)** — the Architecture Specification (the *why*) + the ADR log.
- **[backlog/](backlog/)** — the sequenced epic/story plan (the *what next*).
- **[OPEN-QUESTIONS.md](OPEN-QUESTIONS.md)** — decisions blocked on info someone has to go get.
- **[TECH-DEBT.md](TECH-DEBT.md)** — deliberate shortcuts, each with a paydown trigger.
- **[handoffs/](handoffs/)** — the session journal (resume a chat without replaying the transcript).

## The lifecycle

All application code flows through three gates (skills under `.claude/skills/`):
**`tech-planning`** (approved story) → **`tech-build`** (implement only that increment) →
**`tech-qa`** (independent done-done pass). Status moves on the board in the same commit; a
`.githooks/pre-commit` guard backstops it. On a fresh clone, activate the hook once:

```sh
git config core.hooksPath .githooks
```

## Build cockpit

A zero-dependency progress view, generated from the board + backlog:

```sh
node cockpit/generate.mjs   # writes cockpit/index.html, then open it
```
