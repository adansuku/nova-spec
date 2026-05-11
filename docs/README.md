---
description: Spec-Driven Development for Claude Code and OpenCode — from a ticket to a merged PR in explicit steps, with architectural memory that doesn't decay.
---

# nova-spec

`nova-spec` adds nine `/nova-*` slash commands to Claude Code (and OpenCode) that turn a ticket into a traceable change. It enforces **shape** — sequence, file structure, naming — and stays out of the way for **substance** (you decide if your spec is good, your code is right, your decision is sound).

It is not a generator. It is not a template. It is a set of conventions plus commands your AI agent runs as slash commands inside your repo.

## At a glance

```
/nova-start  →  /nova-spec  →  /nova-plan  →  /nova-build  →  /nova-review  →  /nova-wrap
```

Each command has a guardrail. Each guardrail is deterministic (bash + file existence, never LLM judgment). Skip a step and the next one stops you. Edit any framework file in place — sync hash-compares and never overwrites your changes.

## What you get

* A disciplined ticket → PR flow your agent follows every time
* Architectural memory in atomic markdown: `context/decisions/`, `context/gotchas/`, `context/services/`
* Jira integration as a first-class skill (or `ticket_system: none` if you don't use a tracker)
* Multi-forge: GitHub (`gh`) and GitLab (`glab`) — auto-detected from `git remote`
* Auto-sync on every Claude Code session start, so your team always runs the latest framework

## Where to go next

* **First time?** → [Getting started](getting-started.md)
* **Want to know what each command does?** → [Flow overview](flow/overview.md)
* **Want to customize the PR template, review checklist, or commit format?** → [Customization overview](customization/overview.md)
* **Want to look up a config key or CLI subcommand?** → [Reference](reference/config-yml.md)
* **Hit an error?** → [Troubleshooting](troubleshooting.md)

## Principles in one screen

| | |
|---|---|
| **Form, not substance** | Guardrails check sequence and file shape, not quality. Quality is your job. |
| **Plain markdown** | No DSLs, no schema, no build step. If you can `grep` it, it's source. |
| **No hidden state** | Everything in git. No daemon, no database, no cloud component. |
| **Atomic memory** | One fact = one file. Filename is the index. Supersede explicitly. |
| **You can always escape** | Skip a step, edit a command, bypass the framework — it never blocks shipping. |

The full philosophy lives in the [`PHILOSOPHY.md`](https://github.com/Adansuku/nova-spec/blob/main/PHILOSOPHY.md) of the repo and is the antibody to scope creep.
