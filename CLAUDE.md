# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

→ See AGENTS.md for the full nova-spec framework instructions.

---

## What this repo is

This is the **nova-spec source repo** — the framework itself. It is not a typical code project. There is no build system, no package manager, no test runner. The deliverables are markdown files and a bash installer.

`install.sh` copies `novaspec/` and `AGENTS.md` into consumer repos and creates symlinks under `.claude/` so Claude Code discovers the slash commands.

## Development workflow

nova-spec dogfoods itself. For any non-trivial change, use the full `/nova-*` flow. For small fixes, skip `/nova-spec` and `/nova-plan`.

**To test a change:**
1. Make the edit in `novaspec/commands/`, `novaspec/skills/`, or `novaspec/templates/`.
2. Create a sandbox repo and run the installer against it: `bash install.sh --path /tmp/sandbox-repo`.
3. Open Claude Code in the sandbox and run through a full ticket cycle.
4. Verify symlinks: `ls -la /tmp/sandbox-repo/.claude/`.

**Installer smoke test:**
```bash
bash install.sh --path /tmp/test-repo --target claude
ls -la /tmp/test-repo/.claude/
```

## Architecture

```
novaspec/
├── commands/       7 slash commands (one .md file each, with YAML frontmatter)
├── skills/         Auxiliary skills invoked by commands
├── agents/         Subagents (context-loader, review)
├── guardrails/     Deterministic precondition checks (bash-based, non-zero exit = block)
├── templates/      Artifact templates (proposal, tasks, review, PR body, etc.)
└── config.example.yml
```

Claude Code discovers commands, skills, and agents via `.claude/` symlinks pointing to `novaspec/`. This is the only discovery mechanism — there is no registry or config file beyond the symlinks.

**Guardrails** are the only real enforcement: they must be deterministic (bash + file existence), never LLM-judgment-based. See `PHILOSOPHY.md` for the distinction.

## Key constraints

- **No automated test suite.** Verification is manual (smoke test + human review).
- **`install.sh` is idempotent** but overwrites `novaspec/` and `AGENTS.md`. It preserves `novaspec/config.yml` and `context/` in consumer repos.
- **`CLAUDE.md` is also installed to consumer repos** (it redirects to `AGENTS.md`). Keep it lean; consumer-specific content belongs in `AGENTS.md`.
- **Plain markdown only.** No frontmatter except where Claude Code requires it for slash commands and skills.

## Branch and commit conventions

- Branch pattern: `{type}/{ticket}-{slug}` — e.g. `feature/NOVA-42-add-skill`
- Types: `feature`, `fix`, `arch`, `docs`, `chore`
- Base: `main`
- Commit style: conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`)
