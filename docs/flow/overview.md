---
description: How nova-spec commands, skills, agents and guardrails connect end to end.
---

# Flow overview

nova-spec is nine slash commands plus a small set of supporting pieces. This page is the map.

## The happy path

```text
/nova-start TICKET
       │
       ├─► context-loader (agent)         ── reads stack.md, conventions.md, services, decisions, gotchas
       └─► jira-integration (skill)       ── npx nova-spec jira get TICKET
       │
       ▼
/nova-spec
       │
       └─► close-requirement (skill)      ── forces decisions to be closed
       │
       ▼
/nova-plan
       │
       └─► proposal-closed.sh (guardrail) ── greps TBD/TODO/??? in proposal.md
       │
       ▼
/nova-build                                ── executes tasks one by one
       │
       ▼
/nova-review
       │
       ├─► nova-review-agent (subagent)
       │       │
       │       └─► review-checks.sh       ── diff non-empty, files-to-touch present, lint, tests
       │
       ▼
/nova-wrap
       │
       ├─► write-decision (skill)         ── if real architectural decision was made
       ├─► update-service-context (skill) ── if a service's public interface changed
       ├─► forge (CLI)                    ── npx nova-spec forge pr-command  →  gh pr create | glab mr create
       └─► jira-integration (skill)       ── transition ticket to Done
```

`quick-fix` tickets skip `/nova-spec` and `/nova-plan`.

## The other commands

| Command | Type | When |
|---|---|---|
| [`/nova-status`](nova-status.md) | read-only | Anytime, to inspect where a ticket is |
| `/nova-diff <path>` | read-only | After a sync flagged a file as "you edited it" |
| `/nova-sync` | maintenance | Manually trigger what the SessionStart hook does on its own |

## Pieces in one paragraph

* **Commands** (`novaspec/commands/*.md`) — markdown with imperative instructions for the agent. One per `/nova-*` slash command.
* **Skills** (`novaspec/skills/<name>/SKILL.md`) — reusable units invoked by commands. Four ship: `close-requirement`, `jira-integration`, `write-decision`, `update-service-context`.
* **Agents** (`novaspec/agents/*.md`) — sub-agents that run in their own context window. Two ship: `context-loader` (loads memory at `/nova-start`) and `nova-review-agent` (runs the review).
* **Guardrails** (`novaspec/guardrails/`) — deterministic preconditions. `checklist.md` lists 7 invariants; `proposal-closed.sh` and `review-checks.sh` are bash scripts that exit non-zero to block.
* **Templates** (`novaspec/templates/*.md`) — starting shapes for `proposal.md`, `tasks.md`, `commit.md`, `pr-body.md`, `review.md`, `status-report.md`, `ticket-summary.md`.
* **CLI** (`bin/nova-spec.js` → `lib/`) — `init`, `sync`, `jira`, `forge`, `source`. The CLI is what `npx nova-spec ...` runs; the slash commands invoke it for deterministic operations (Jira API, forge command, source path lookup).

## How the agent discovers all this

The installer creates symlinks under `.claude/` (and `.opencode/`):

```text
.claude/commands  →  ../novaspec/commands/
.claude/skills    →  ../novaspec/skills/
.claude/agents    →  ../novaspec/agents/
```

Claude Code's standard slash-command and skill discovery picks them up. There is no plugin, no registry, no daemon. Editing `novaspec/commands/nova-wrap.md` directly changes what the agent does — the next session sees your edit through the symlink.

## How files reach you when nova-spec releases an update

Two mechanisms work together:

1. **`SessionStart` hook** in `.claude/settings.local.json` runs `npx nova-spec@latest sync` every time Claude Code or OpenCode starts. The `@latest` forces npm to re-check the registry, so a published `1.0.3` reaches every developer the next time they open the IDE.

2. **Hash-compare in sync.** Every framework file is hashed (SHA-256) at install time. On sync, the new shipped hash is compared with what was last shipped (recorded in the manifest). If your local copy still matches the previously-shipped hash, the new version overwrites it. If you edited the file, your edit is preserved and the path is reported in the sync output.

See [Architecture → Sync internals](../architecture/sync-internals.md) for the gritty details.

## What happens at each step

Click into the dedicated page for each command:

* [`/nova-start`](nova-start.md) — classify, branch, load context
* [`/nova-spec`](nova-spec.md) — close decisions, write `proposal.md`
* [`/nova-plan`](nova-plan.md) — translate spec into `tasks.md`
* [`/nova-build`](nova-build.md) — execute tasks one by one
* [`/nova-review`](nova-review.md) — deterministic checks + LLM review
* [`/nova-wrap`](nova-wrap.md) — memory, commit, PR/MR, close ticket
* [`/nova-status`](nova-status.md) — read-only state inspection
