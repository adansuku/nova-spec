<p align="center">
  <img src="img/novaspec-logo.svg" alt="nova-spec" width="480">
</p>

<p align="center">
  <strong>Spec-Driven Development on top of Claude Code.</strong><br>
  From a ticket to a merged PR in explicit steps, with architectural memory that doesn't decay.
</p>

<p align="center">
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-blue.svg"></a>
  <img alt="Status: experimental" src="https://img.shields.io/badge/status-experimental-orange.svg">
  <img alt="Built for Claude Code" src="https://img.shields.io/badge/built%20for-Claude%20Code-purple.svg">
</p>

---

## What it is

`nova-spec` adds seven `/nova-*` commands to Claude Code that turn a ticket into a traceable change: classify, close requirements, plan, implement task by task, review, and wrap up with commit + PR + memory update. Memory (`context/decisions/`, `context/gotchas/`, `context/services/`) lives in atomic markdown files that humans edit and `grep` finds.

It's not a template or a generator. It's a set of conventions + commands that Claude Code runs as slash commands inside your repo.

## Who is this for

- Developers using **Claude Code** (or OpenCode) on real projects, not toy demos.
- Teams that want their AI agent to follow a **disciplined ticket → PR flow** instead of one-shotting code.
- Anyone tired of **re-explaining the same architectural context** every new chat.

If you only use Claude Code for one-off scripts, this is overkill. If you ship to production with it, read on.

## Why it exists

Without discipline, an agent writes code fast and loses the *why*. The next ticket forces you to re-explain the same context. `nova-spec` enforces human checkpoints, separates spec from executable tasks, and leaves a trail in `context/` so the next ticket starts informed.

## Quickstart

```bash
# 1. Clone nova-spec on your machine (one time only)
git clone https://github.com/adansuku/nova-spec.git ~/tools/nova-spec

# 2. From the repo where you want to use it
cd /path/to/your-project
bash ~/tools/nova-spec/install.sh

# 3. Open Claude Code and launch your first ticket
claude
/nova-start PROJ-123
```

Full details in [INSTALL.md](./INSTALL.md).

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

No code yet. The agent has classified the work, created the branch, and pulled in only the architectural decisions that matter for this ticket. From here you'd move on to `/nova-spec` to close requirements, then `/nova-plan`, then `/nova-build`.

## Flow

```
/nova-start → /nova-spec → /nova-plan → /nova-build → /nova-review → /nova-wrap
```

| Command | What it does |
|---|---|
| `/nova-init` | One-off bootstrap: scans the repo and generates draft `context/services/` files with TODOs |
| `/nova-start <TICKET>` | Pulls the ticket, classifies it (quick-fix / feature / architecture), creates a branch, loads context |
| `/nova-spec` | Closes open decisions and writes `proposal.md` |
| `/nova-plan` | Translates the spec into `tasks.md` (plan + tasks) |
| `/nova-build` | Executes tasks one by one with incremental review |
| `/nova-review` | Final code review against spec, conventions and decisions |
| `/nova-wrap` | Updates memory, archives the spec, creates commit and PR |
| `/nova-status [TICKET]` | Current status of the ticket (read-only) |

`quick-fix` tickets skip `/nova-spec` and `/nova-plan`. `/nova-init` is optional and runs only once when installing nova-spec into an existing repo.

## Principles

- **No skipping steps.** Each command has a guardrail that checks preconditions.
- **No making up context.** If info is missing, the command asks.
- **Human checkpoints** after `/nova-spec` and before `/nova-wrap`.
- **Memory that doesn't decay:** one fact = one file, name = index, explicit supersede.

## Documentation

- Detailed install: [INSTALL.md](./INSTALL.md)
- Internal architecture: [novaspec/README.arch.md](./novaspec/README.arch.md)
- Quick reference: [novaspec/README.quickref.md](./novaspec/README.quickref.md)
- Contributing: [CONTRIBUTING.md](./CONTRIBUTING.md)

## See also

`nova-spec` was built using itself. The full development history — including specs, decisions, gotchas and dogfooding — is preserved in the lab repo: [adansuku/nova-spec-lab](https://github.com/adansuku/nova-spec-lab).

## License

MIT — see [LICENSE](./LICENSE).
