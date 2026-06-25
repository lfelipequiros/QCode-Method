# Updating projects with `qcode-sync`

QCode-Method is a *living* framework: the gates, the trackers, the cockpit, and the scaffolder keep
improving. This doc explains how an improvement made **here** flows out to the projects already built
on the framework — and which files that touches.

## The two-repo loop

```
                 you improve a template / skill here
   QCode-Method  ───────────────────────────────────────────►  bump VERSION, commit, push
   (this repo)                                                        │
        │                                                             │
        │  node scripts/qcode-sync.mjs <project> [--write]            │
        ▼                                                             ▼
   a scaffolded project  ◄──────────────  pulls the framework-owned files, re-rendered
   (has .qcode/config.json)                with its own recorded tokens
```

- **Scaffold** a new project once with `qcode-project-scaffolder` (copy the skill folder into the new
  repo, run it). It writes `.qcode/config.json` recording the framework version + the interview tokens.
- **Update** an existing project any time by running `qcode-sync` from a fresh QCode-Method clone,
  pointing it at that project.

## Framework-owned vs project-owned (what sync touches)

This split is the whole safety model. `qcode-sync` only ever re-renders **framework-owned** files;
**project-owned** files are yours and are never touched.

| Framework-owned (sync manages) | Project-owned (never touched) |
|---|---|
| `.claude/skills/tech-planning/SKILL.md` | `CLAUDE.md` |
| `.claude/skills/tech-build/SKILL.md` | `README.md` |
| `.claude/skills/tech-qa/SKILL.md` | `PROJECT-STATUS.md` |
| `.claude/skills/record-learnings/SKILL.md` | `OPEN-QUESTIONS.md`, `TECH-DEBT.md` |
| `.claude/skills/handoff/SKILL.md` | `backlog/**`, `architecture/**` |
| `.claude/skills/compass-check/SKILL.md` *(if enabled)* | `handoffs/**` |
| `.githooks/pre-commit` | `.env.example`, `package.json` |
| `.gitattributes` | `.claude/skills/compass-check/business-context.md` *(you fill it in)* |
| `cockpit/generate.mjs` *(your `LAYERS` block is preserved)* | `.qcode/config.json` *(only the version line is bumped)* |

> **One caveat to understand.** The framework-owned skill files ship with `(to define)` gaps that your
> team fills during foundation (e.g. the real seam/tenancy invariants in the gate alignment
> checklists). A sync that updates one of those files can overwrite your filled-in edits. `qcode-sync`
> protects you three ways: it is **diff-first** (shows you exactly what changes before writing), it
> **backs up** every file it overwrites to `<file>.qcode-bak`, and it **preserves the cockpit's
> `LAYERS`** block automatically. After a `--write`, re-check the diffs and re-apply any project
> invariants the update reset. Treat sync as *assisted merge*, not blind overwrite.

## Running it

From a current QCode-Method clone:

```sh
# 1. See what would change — writes nothing:
node scripts/qcode-sync.mjs "../path/to/your-project"

# 2. Apply (each changed file backed up to .qcode-bak, version bumped on success):
node scripts/qcode-sync.mjs "../path/to/your-project" --write
```

`qcode-sync` reads the project's `.qcode/config.json` for the interview tokens, re-renders each
framework-owned template with them, and diffs against what's there. If `config.json` is missing a
token a managed file needs, that file is **skipped** (never written half-rendered) with a message to
add the token. On success in `--write` mode it bumps `frameworkVersion` and stamps `syncedAt`.

After applying: review the diffs, re-apply any `(to define)` invariants you'd customized, run
`node cockpit/generate.mjs` to confirm the cockpit still builds, then commit (the project's
`pre-commit` guard treats skill/tooling changes as no-status-impact, so a normal commit is fine).

## Versioning & releasing (maintainers of this repo)

- **Canonical version** lives in `.claude/skills/qcode-project-scaffolder/VERSION` — it travels with
  the scaffolder when the folder is copied standalone into a new repo. The repo-root `/VERSION`
  **mirrors** it for visibility. A release **bumps both to the same value**; `qcode-sync` warns if they
  drift.
- **SemVer intent:** patch = wording/safe template fixes; minor = new template/skill or a new
  `(to define)` gap; major = a change that requires manual project migration (call it out in the
  release notes here).
- A release is just: edit templates → bump both VERSION files → commit → push. Projects pull at their
  own pace via `qcode-sync`.
