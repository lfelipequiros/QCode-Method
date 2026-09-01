# Updating and migrating projects

QCode-Method is a *living* framework: the gates, the trackers, the cockpit, and the scaffolder keep
improving. This doc explains how an improvement made **here** flows out to projects already built on
the framework, how an older v1-shaped project moves to the current shape, and which files any of that
touches.

## The two-repo loop

```
                 you improve a template / skill here
   QCode-Method  ───────────────────────────────────────────►  bump VERSION, commit, push
   (this repo)                                                        │
        │                                                             │
        │  node qcode.mjs sync <project> [--write]                    │
        ▼                                                             ▼
   a scaffolded project  ◄──────────────  pulls the framework-owned files, re-rendered
   (has .qcode/config.json)                with its own recorded tokens
```

- **Scaffold** a new project once with `qcode-project-scaffolder`, run from a QCode-Method clone
  (nothing to copy first) — it drives `qcode.mjs generate` and hands off to `qcode-charter` for the
  judgment interview. It writes `.qcode/config.json` recording the framework version + every token.
- **Update** an existing (already v2-shaped) project any time by running `qcode.mjs sync` from a
  fresh QCode-Method clone, pointing it at that project.
- **Migrate** an older v1-shaped project (flat `epic-NN.md` files, a "Recently done" log) to the
  current shape once, with `qcode.mjs migrate` — see "Migrating a v1-shaped project," below.
- **Check** any project's readiness — structurally valid, and how complete — with `qcode.mjs check`.

One renderer, four modes, all built on `lib/qcode-core.mjs`. There is no separate sync script anymore
— `qcode.mjs sync` replaced `scripts/qcode-sync.mjs`, which this doc used to document and which no
longer exists in this repo.

## Framework-owned vs project-owned (what `sync` touches)

This split is the whole safety model. `sync` only ever re-renders **framework-owned** files;
**project-owned** files are yours and are never touched. The rule lives in code, not a hand-maintained
list here — `lib/qcode-core.mjs`'s `isFrameworkOwned()` is the one implementation both `sync` and
`migrate` read, so this doc and the actual behavior can't drift apart the way a second, hand-copied
table would:

- **Framework-owned** — anything under `skills/`, `githooks/`, `ci/`, `scripts/`, or `cockpit/` in the
  template tree (which means, in a scaffolded project: every gate's `SKILL.md`, `record-learnings`,
  `handoff`, `compass-check` *(if installed)*, the pre-commit guard + its shared predicate, the CI
  workflow template, `board-check.mjs`/`status-vocab.mjs`/`check-links.mjs`/`index-backlog.mjs` and
  `board-check.mjs`'s own test file, and the cockpit generator — with your `LAYERS` block preserved).
  Plus `.gitattributes`.
- **Project-owned** — everything else: `CLAUDE.md`, `README.md`, `PROJECT-STATUS.md`, `backlog/**`,
  `architecture/**`, `OPEN-QUESTIONS.md`, `TECH-DEBT.md`, `handoffs/**`, `.env.example`,
  `package.json`, `.qcode/config.json` *(only the version/sync-date lines are touched)*,
  `skills-lock.json` *(you fill in the hashes)*, and one deliberate exception inside a
  framework-owned directory — `compass-check/business-context.md`, which is compass-check's own
  answers, not its logic, so it's excluded from the framework-owned sweep even though it lives
  under `skills/`.

> **One caveat to understand.** The framework-owned skill files ship with `(to define)` gaps your team
> fills during foundation (e.g. the real seam/tenancy invariants in the gate alignment checklists). A
> sync that updates one of those files can overwrite your filled-in edits. `sync` protects you three
> ways: it is **diff-first** (shows you exactly what changes before writing), it **backs up** every
> file it overwrites to `<file>.qcode-bak`, and it **preserves the cockpit's `LAYERS`** block
> automatically. A file listed in `.qcode/config.json`'s `customized` array is shown as a diff but
> never overwritten at all without `--force`. After a `--write`, re-check the diffs and re-apply any
> project invariants the update reset — treat `sync` as *assisted merge*, not blind overwrite.

## Migrating a v1-shaped project

A project scaffolded before the ADR-059 board/backlog shape existed has flat `backlog/epic-NN.md`
files and a "Recently done" log on `PROJECT-STATUS.md`, instead of one file per story and an
append-only `backlog/CLOSED.md`. `sync` deliberately never performs this conversion — the shape change
touches project-owned files sync is built to never write. `qcode.mjs migrate` does it once:

```sh
node qcode.mjs migrate "../your-project"            # dry-run: report every file it would split/move
node qcode.mjs migrate "../your-project" --write     # apply, then install the operational tooling too
```

It splits each flat epic file into `backlog/epic-NN-slug/` (a generated `README.md` index + one file
per story, spec and closure narrative kept together), builds `backlog/CLOSED.md` from the board's
existing closed-work log, rewrites every affected link, and — since a genuinely v1 project predates
`board-check.mjs`/the cockpit/the CI template by definition — installs the operational tooling
(`scripts/`, `cockpit/`, `githooks/`, `ci/`) the same way `sync` would, so `board:check` is actually
runnable immediately after, not just structurally converted. It deliberately does **not** install
`skills/` — adopting the lifecycle gates into an existing project is `sync`'s job, once the team
chooses to.

This repo's own board is `migrate`'s first real subject — see `backlog/CLOSED.md`'s `05.4` row for
the bugs a real run against real, structurally irregular content found that a synthetic fixture alone
didn't.

## Adopting a pre-QCode donor project (already gate-shaped, never scaffolded)

Different from migration: a project that predates QCode-Method — or the platform the framework was
generalized *from* — may already have gates, a board, and a cockpit of its own, just never run through
`generate`. You don't re-scaffold it and you don't `migrate` it (it's not v1-shaped, it just has no
`.qcode/config.json`). You **adopt** it by hand-writing that one file:

```json
{
  "configVersion": 1,
  "frameworkVersion": "2.0.0",
  "scaffoldedAt": "2026-06-25",
  "compassCheck": true,
  "customized": ["record-learnings", "compass-check"],
  "tokens": { "PROJECT_NAME": "…", "OWNER_NAME": "…", "ACCESS_LAYER": "…", "...": "…" }
}
```

- **`tokens`** — the project's real values (read them off its `CLAUDE.md`). Tune them so the
  framework-owned files the project did *not* enrich render **identical** to what's there — then a
  dry-run shows those as up-to-date, and only genuine future framework changes ever surface.
- **`customized`** — the key move for a donor project: any framework-owned file it has **enriched
  beyond the generic base** (e.g. extra `record-learnings` routing rows, a fuller `compass-check`).
  Listing it here makes `sync` treat it as **review-only** — diff shown, never overwritten without
  `--force`. This is what guarantees adoption loses nothing.

After writing the config, dry-run (`node qcode.mjs sync <project>`) and confirm the split you expect:
un-enriched files `up to date`, enriched files flagged `customized`, zero writes. That output is your
baseline. From then on the project updates like any other — hand-port improvements into the
`customized` files instead of letting sync overwrite them.

## Running `sync`

From a current QCode-Method clone:

```sh
# 1. See what would change — writes nothing:
node qcode.mjs sync "../path/to/your-project"

# 2. Apply (each changed file backed up to .qcode-bak, version bumped on success):
node qcode.mjs sync "../path/to/your-project" --write
```

`sync` reads the project's `.qcode/config.json` for the interview tokens, re-renders each
framework-owned template with them, and diffs against what's there. If `config.json` is missing a
token a managed file needs, that file is **skipped** (never written half-rendered), reported plainly.
On success in `--write` mode it bumps `frameworkVersion` and stamps `syncedAt`.

After applying: review the diffs, re-apply any `(to define)` invariants you'd customized, run
`node cockpit/generate.mjs` to confirm the cockpit still builds, then commit (the project's
`pre-commit` guard treats skill/tooling changes as no-status-impact, so a normal commit is fine).

## Versioning & releasing (maintainers of this repo)

- **Canonical version** lives in `.claude/skills/qcode-project-scaffolder/VERSION` — it travels with
  the scaffolder when the folder is copied standalone into a new repo. The repo-root `/VERSION`
  **mirrors** it for visibility. A release **bumps both to the same value**.
- **SemVer intent:** patch = wording/safe template fixes; minor = new template/skill or a new
  `(to define)` gap; major = a change that requires manual project migration (call it out in the
  release notes here).
- A release is just: edit templates → bump both `VERSION` files → commit → push. Projects pull at
  their own pace via `sync`.
