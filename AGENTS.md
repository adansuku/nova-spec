# nova-spec — framework AGENTS.md

> This repo uses `CLAUDE.md` as a stub → `AGENTS.md` is the instructions file.

This repo is the **nova-spec framework itself** — a Spec-Driven Development (SDD) system for Claude Code. It's designed to be installed into other projects.

## What is nova-spec

Framework that orchestrates ticket-to-PR workflow with 7 slash commands: `/nova-start` → `/nova-spec` → `/nova-plan` → `/nova-build` → `/nova-review` → `/nova-wrap` → `/nova-status`.

## Installation (consumer repos)

To install nova-spec into another repo, run:

```bash
npx nova-spec init
```

That leaves the repo usable without manual steps:

- `AGENTS.md` and `CLAUDE.md` (shim that points to `AGENTS.md`)
- `novaspec/` framework files
- `.claude/` symlinks (and optionally `.opencode/`)
- `context/` memory structure
- `novaspec/config.yml` is **gitignored** (local per-repo configuration)

## Key commands

- `/nova-start <TICKET>` — classify ticket, create branch, load context
- `/nova-spec` — close requirements, generate spec (uses `close-requirement` skill)
- `/nova-plan` — create plan + tasks
- `/nova-build` — execute tasks one-by-one
- `/nova-review` — final code review
- `/nova-wrap` — commit, PR, update memory (uses `write-decision`, `update-service-context`)

Quick-fixes skip `/nova-spec` and `/nova-plan`.

## Branch config

In `novaspec/config.yml`:
- Pattern: `{type}/{ticket}-{slug}` (e.g., `feature/AGEX-123-new-feature`)
- Types: bugfix, hotfix, feature, documentation, refactor, chore, architecture
- Base branch: `main`

## Memory structure

```
context/
├── decisions/              # Why we did X (one file per decision)
│   └── archived/           # Superseded (never auto-loaded by agents)
├── gotchas/                # Non-obvious traps in the code
├── services/               # Short map per service (≤80 lines, flat files)
├── changes/
│   ├── active/             # In-progress specs
│   └── archive/            # Closed specs
└── backlog/                # Pending proposals
```

Memory model: one fact = one file, filename = index, explicit supersede via `> Supersedes: <old>.md`. Wisdom about memory itself lives in `decisions/`, not in `AGENTS.md`.

## Auto-sync on session start

At the start of every session, check if nova-spec has pending updates by running:

```
/nova-sync
```

If `novaspec/.nova-manifest.json` exists and the installed version matches the latest, skip it silently. If there are updates or outdated custom overrides, report them to the user before proceeding.

This repo (and consumer repos) use `npx nova-spec sync` to update stock files **idempotently** without clobbering local edits.
Sync records what was last shipped to the repo in `novaspec/.nova-manifest.json`, and only updates files that are still untouched locally.

Hooks are maintained in:

- `.claude/settings.local.json` (Claude Code)
- `.opencode/settings.local.json` (OpenCode)

## Symlinks

Claude Code discovers commands via `.claude/` symlinks pointing to `novaspec/`.

## Working here

This repo uses itself. When modifying nova-spec:
1. Test changes in a worktree or sandbox project
2. Verify symlinks work: `ls -la .claude/`
3. Run through a full ticket cycle

## Tests

Run the smoke test suite with:

```bash
npm test
```

## Reference

- Full docs: [README.md](./README.md)
- Installation: [INSTALL.md](./INSTALL.md)
- Commands: `novaspec/commands/*.md`
- Skills: `novaspec/skills/*/SKILL.md`
