# nova-spec — framework AGENTS.md

> This repo uses CLAUDE.md as a stub → AGENTS.md is the instructions file.

This repo is the **nova-spec framework itself** — a Spec-Driven Development (SDD) system for Claude Code. It's designed to be installed into other projects.

## What is nova-spec

Framework that orchestrates ticket-to-PR workflow with 7 slash commands: `/nova-start` → `/nova-spec` → `/nova-plan` → `/nova-build` → `/nova-review` → `/nova-wrap` → `/nova-status`.

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

## Symlinks

Claude Code discovers commands via `.claude/` symlinks pointing to `novaspec/`.

## Working here

This repo uses itself. When modifying nova-spec:
1. Test changes in a worktree or sandbox project
2. Verify symlinks work: `ls -la .claude/`
3. Run through a full ticket cycle

## Reference

- Full docs: [README.md](./README.md)
- Installation: [INSTALL.md](./INSTALL.md)
- Commands: `novaspec/commands/*.md`
- Skills: `novaspec/skills/*/SKILL.md`
