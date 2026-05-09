<p align="center">
  <img src="img/novaspec-logo.svg" alt="nova-spec" width="480">
</p>

<p align="center">
  <strong>Spec-Driven Development for Claude Code and OpenCode.</strong><br>
  From a ticket to a merged PR in explicit steps, with architectural memory that doesn't decay.
</p>

<p align="center">
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-blue.svg"></a>
  <img alt="Status: experimental" src="https://img.shields.io/badge/status-experimental-orange.svg">
  <a href="https://www.npmjs.com/package/nova-spec"><img alt="npm" src="https://img.shields.io/npm/v/nova-spec.svg"></a>
  <img alt="Built for Claude Code" src="https://img.shields.io/badge/built%20for-Claude%20Code%20%7C%20OpenCode-purple.svg">
</p>

---

## What it is

`nova-spec` adds seven `/nova-*` slash commands to Claude Code (and OpenCode) that turn a ticket into a traceable change: classify, close requirements, plan, implement task by task, review, and wrap up with commit + PR + memory update.

Architectural memory (`context/decisions/`, `context/gotchas/`, `context/services/`) lives in atomic markdown files that humans edit and `grep` finds.

It's not a template or a generator. It's a set of conventions + commands that your AI agent runs as slash commands inside your repo.

## Who is this for

- Developers using **Claude Code** or **OpenCode** on real projects, not toy demos.
- Teams that want their AI agent to follow a **disciplined ticket → PR flow** instead of one-shotting code.
- Anyone tired of **re-explaining the same architectural context** every new chat.

If you only use Claude Code for one-off scripts, this is overkill. If you ship to production with it, read on.

## Quickstart

```bash
npx nova-spec init
```

That's it. The interactive wizard asks where to install (global or per-project), which runtime (Claude Code, OpenCode, or both), and optionally your Jira connection. It generates a ready-to-use `config.yml` — no manual editing required.

Then open your editor and run your first ticket:

```
/nova-start PROJ-123
```

## A taste of it

What `/nova-start PROJ-42` actually does:

```text
> /nova-start PROJ-42

Ticket: PROJ-42 — "Add rate limiting to /api/login"
Classification: feature (2h-3d)
Affected services: auth-api ✓

Branch created: feature/PROJ-42-rate-limit-login (from main)

Loaded context:
  Services: auth-api ✓
  Decisions read: throttling-strategy.md, redis-usage.md
  Gaps: none
  Questions: none

Next step: /nova-spec
```

No code yet. The agent classified the work, created the branch, and pulled in only the architectural decisions that matter for this ticket.

## Flow

```
/nova-start → /nova-spec → /nova-plan → /nova-build → /nova-review → /nova-wrap
```

| Command | What it does |
|---|---|
| `/nova-start <TICKET>` | Pulls the ticket, classifies it (quick-fix / feature / architecture), creates a branch, loads context |
| `/nova-spec` | Closes open decisions and writes `proposal.md` |
| `/nova-plan` | Translates the spec into `tasks.md` (plan + tasks) |
| `/nova-build` | Executes tasks one by one with incremental review |
| `/nova-review` | Final code review against spec, conventions and decisions |
| `/nova-wrap` | Updates memory, archives the spec, creates commit and PR |
| `/nova-status [TICKET]` | Current status of the ticket (read-only) |
| `/nova-sync` | Updates nova-spec core to the latest version |
| `/nova-diff <name>` | Shows diff between your custom override and the new core version |

`quick-fix` tickets skip `/nova-spec` and `/nova-plan`.

## Customizing skills and commands

Place any file in `novaspec/custom/` to override the core version — same name, your rules:

```
novaspec/
├── skills/         ← core (managed by nova-spec)
└── custom/
    └── skills/
        └── nova-wrap/   ← your override, same name wins
```

Run `/nova-sync` to update the core. Your `custom/` folder is never touched.

## Keeping up to date

```bash
npx nova-spec sync
```

Updates the core, preserves your custom overrides and `config.yml`, and tells you if any of your overrides have upstream changes worth reviewing.

## Principles

- **No skipping steps.** Each command has a guardrail that checks preconditions.
- **No making up context.** If info is missing, the command asks.
- **Human checkpoints** after `/nova-spec` and before `/nova-wrap`.
- **Memory that doesn't decay:** one fact = one file, name = index, explicit supersede.

## Documentation

- Install options: [INSTALL.md](./INSTALL.md)
- Design philosophy: [PHILOSOPHY.md](./PHILOSOPHY.md)
- Contributing: [CONTRIBUTING.md](./CONTRIBUTING.md)

## License

MIT — see [LICENSE](./LICENSE).
