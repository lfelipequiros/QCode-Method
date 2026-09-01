---
name: qcode-project-scaffolder
description: >-
  Entry point for bootstrapping a NEW project onto QCode-Method — the same product-check→plan→
  build→qa discipline, status board, trackers, backlog, the record-learnings sweep + handoff
  system, git guard, progress cockpit, and (optionally) the compass-check strategic advisor. Use
  this when starting a new repo and you want the project-management + SDLC scaffolding set up from
  day one: "scaffold a new project, bootstrap the SDLC, set up project management, kickstart an
  AI-dev project, give me the gates/status board/handoffs in this repo, set up the operating
  system, run QCode." Gathers the five static-identity facts (name, slug, owner, git remote,
  whether to init git + install compass-check) conversationally, drives `node qcode.mjs generate`
  to render the whole tree and self-test it, then hands off to the `qcode-charter` skill — now
  present in the new project — for the judgment interview (goal, value model, stack, architecture,
  roadmap) this skill deliberately does not ask itself. Do NOT use it to plan a feature inside an
  already-scaffolded project (that's `tech-planning`, or `product-check` for a new idea) — this
  bootstraps the framework itself, once, per project. Run from a QCode-Method clone; nothing needs
  to be copied into the target repo first.
---

# QCode Project Scaffolder

The entry point for turning "I want a new project on QCode-Method" into a real, working repo. It
does not do the scaffolding itself — it **drives** `qcode.mjs generate` (a script: deterministic,
self-testing, zero judgment) and then **hands off** to `qcode-charter` (a skill: the interview for
everything a script can't decide). This split is deliberate — see "Why it's shaped this way."

## How to use it

**Nothing needs to be copied anywhere first.** Run this from a QCode-Method clone; `qcode.mjs`
renders from that clone's own `assets/templates/` into whatever target path you give it.

1. **Gather the five static-identity answers conversationally** — don't make the user learn CLI
   flags. Ask (or infer from what they've already said):
   - **Project name** and **slug** (kebab-case; offer to derive the slug from the name).
   - **Owner** — who holds the wheel (used by `compass-check` if installed; default "the owner").
   - **Git remote** (optional — skip if they don't have one yet).
   - **Initialize git + install the status-guard hook now?** (default yes.)
   - **Install the optional `compass-check` strategic advisor?** (default yes.)

   That's the whole ask here — no value model, no stack, no architecture, no roadmap. Those are
   `qcode-charter`'s job, next; asking them now would mean asking twice or guessing badly once.
2. **Run `qcode.mjs generate`** via Bash, with every answer as an explicit flag and `--yes` — don't
   rely on the script's own interactive prompts, since a tool-driven Bash call has no real TTY for
   them to read from:
   ```sh
   node qcode.mjs generate <target-dir> --name "<name>" --slug <slug> --owner "<owner>" \
     [--remote <url>] [--git|--no-git] [--compass-check|--no-compass-check] --yes
   ```
   It renders every template, merges `package.json`, writes `.qcode/config.json`, optionally runs
   `git init` + installs the hook, then **self-tests** (`board:check` + the cockpit must both
   succeed) before reporting success — if it exits non-zero, that's a rendering bug, not something
   to paper over; report it plainly rather than declaring the project ready.
3. **Report what it printed** — files created, the `(to define)` gap count, and that status lives
   only in `PROJECT-STATUS.md`.
4. **Hand off to `qcode-charter`.** It's now present at `<target-dir>/.claude/skills/qcode-charter/`
   — say explicitly that it's the next step, and that it needs to run **from inside the new
   project** (a skill is discovered from the current working directory's own `.claude/skills/`, so
   switch context there before invoking it). Don't run its interview yourself from here.
5. **Staying current, later:** once the project exists, framework updates land the same way —
   `qcode.mjs sync <target-dir>` (or `qcode.mjs migrate`, for a shape change) from a fresh
   QCode-Method clone. See `docs/updating-projects.md`.

## Placeholder convention (read `references/filling-the-gaps.md`)

Templates carry two kinds of blanks — worth understanding even though this skill no longer
substitutes them itself (`qcode.mjs` does):

- **`{{TOKEN}}`** — resolved at generate time, from the five static answers plus `qcode-charter`'s
  later judgment answers (until then, a sensible default or a `(to define: ...)` placeholder).
- **`(to define: <what> — <how/when to fill>)`** — what a judgment token becomes when `generate`
  can't answer it. Left **in place, verbatim**, for `qcode-charter` to resolve.

The full token list and the gap checklist live in
[`references/filling-the-gaps.md`](references/filling-the-gaps.md).

## Where a template actually goes

`qcode.mjs generate` renders every file under `assets/templates/` — the mapping from a template's
path to its target path is **code**, not a hand-maintained list here (a second, hand-written copy
of the same mapping is exactly the kind of drift this framework's own tooling exists to prevent
elsewhere; see `lib/qcode-core.mjs`'s own header). Read `templateToTargetPath()` in
[`../../../lib/qcode-core.mjs`](../../../lib/qcode-core.mjs) if you need the exact rule set — in
short: most paths map 1:1, `skills/*` gains a `.claude/` prefix, `githooks/*` gains a `.` prefix,
`ci/board-guard.yml` goes to `.github/workflows/`, and the bare dotfile templates
(`gitignore`/`gitattributes`/`env.example`) gain their leading dot.

## Why it's shaped this way

A project's *discipline and structure* are reusable; its *domain, value model, stack, and
architecture* are not — and neither is deterministic to derive the way a slug or a file path is. So
this splits cleanly along that line: a **script** (`qcode.mjs generate`) does everything that's
actually mechanical and can prove itself correct (self-testing before declaring success is only
possible because it's deterministic), and a **skill** (`qcode-charter`) does everything that
genuinely needs judgment, with every gap it can't yet resolve left as an explicit, instructed
`(to define)` marker rather than a silent guess. Splitting them was also what made the script
*testable* in the first place — 05.1/05.2's fixture suites exercise `generate` end-to-end against
real scratch directories precisely because it has no conversational judgment baked into it to mock.
