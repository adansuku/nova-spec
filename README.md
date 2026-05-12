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

<p align="center">
  <a href="https://adansuku.github.io/nova-spec/"><strong>📖 Read the documentation →</strong></a>
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
  Stack: ✓ loaded
  Conventions: ✓ loaded
  Services: auth-api ✓
  Decisions read: throttling-strategy.md, redis-usage.md
  Gaps: none
  Questions: none

Next step: /nova-spec
```

No code yet. The agent classified the work, created the branch, and pulled in only the architectural decisions that matter for this ticket.

## Flow

```
/nova-start → /nova-spec → /nova-plan → /nova-build → /nova-review → /nova-wrap → /nova-rework (if review feedback)
```

| Command | What it does |
|---|---|
| `/nova-start <TICKET>` | Pulls the ticket, classifies it (quick-fix / feature / architecture), creates a branch, loads context |
| `/nova-spec` | Closes open decisions and writes `proposal.md` |
| `/nova-plan` | Translates the spec into `tasks.md` (plan + tasks) |
| `/nova-build` | Executes tasks one by one with incremental review |
| `/nova-review` | Final code review against spec, conventions and decisions |
| `/nova-wrap` | Updates memory, archives the spec, creates commit and PR — moves Jira to **Code Review** |
| `/nova-rework` | Apply reviewer feedback rounds after PR is open — pushes to existing PR |
| `/nova-status [TICKET]` | Current status of the ticket (read-only) |
| `/nova-sync` | Updates nova-spec core to the latest version |
| `/nova-diff <path>` | Shows diff between your local edits and the latest package version |
| `/nova-seed` | **One-time** bootstrap of `context/` (stack, conventions, services) from an existing codebase |

`quick-fix` tickets skip `/nova-spec` and `/nova-plan`. **Jira ticket reaches "Done" automatically when the PR merges** via Jira's native GitHub / GitLab integration — nova-spec doesn't do that step.

### Team-specific helpers (Jira + GitLab)

Two skills are bundled for everything around the `/nova-*` flow:

| Command | What it does |
|---|---|
| `/jira show <TICKET>` | Show ticket details (formatted) |
| `/jira list` | Your open tickets |
| `/jira improve <TICKET>` | Detect quality gaps, ask 2-4 questions, update the ticket in Jira |
| `/jira comment <TICKET>` | Add a comment |
| `/gitlab create` | Create MR with team-specific body template |
| `/gitlab review <ID>` | Review an MR — fetch, comment, approve |
| `/gitlab pipeline` | Pipeline status for current branch |
| `/gitlab list` / `my` / `assigned` | List MRs |
| `/gitlab merge <ID>` | Merge an MR |

The same `jira-integration` skill that powers `/nova-start` and `/nova-wrap` also exposes `/jira` for ad-hoc operations. Details: [Jira integration](https://adansuku.github.io/nova-spec/integrations/jira) and [GitLab integration](https://adansuku.github.io/nova-spec/integrations/gitlab).

## Customizing the framework

Edit any file under `novaspec/` directly. **There is no separate "custom" folder** — your edits live where they're used. `npx nova-spec sync` hash-compares every file and never overwrites the ones you've touched.

### The 5 things your team will likely want to change

1. **PR / MR template** → `novaspec/templates/pr-body.md`
   What `/nova-wrap` puts in the description box. Add your team's QA checklist, ticket-link format, security notes.

2. **Code review checklist** → `novaspec/templates/review.md`
   The structure `/nova-review` follows. Add your conventions, your blockers, your sections.

3. **Commit message format** → `novaspec/templates/commit.md`
   Conventional commits, custom prefixes, ticket-in-subject — whatever your team enforces.

4. **Ticket system** → `novaspec/config.yml` → `ticket_system`
   Set to `jira` for Atlassian Jira, or `none` to paste tickets manually. `none` skips ticket-key validation in `/nova-start`.

5. **Stack & conventions context** → `context/stack.md` and `context/conventions.md`
   Loaded at the start of every ticket so the agent knows your tech, your patterns, your "we don't do that here". The installer creates both files with comments explaining what to put in them.

Other useful tweaks: forge (`config.yml` → `forge.type`: github/gitlab), branch base (`branch.base`), guardrails (`novaspec/guardrails/*.sh`).

After any edit, commit it with the team — everyone gets the same flow.

## Keeping up to date

`npx nova-spec sync` runs automatically when Claude Code or OpenCode start (via a `SessionStart` hook). You can also run it manually:

```bash
npx nova-spec sync
```

It updates only the files you haven't edited locally and reports the rest.

## Principles

- **No skipping steps.** Each command has a guardrail that checks preconditions.
- **No making up context.** If info is missing, the command asks.
- **Human checkpoints** after `/nova-spec` and before `/nova-wrap`.
- **Memory that doesn't decay:** one fact = one file, name = index, explicit supersede.

## Documentation

**Full docs site**: [adansuku.github.io/nova-spec](https://adansuku.github.io/nova-spec/) — getting started, every command, customization, integrations, architecture, troubleshooting, working as a team.

Local references in this repo:
- Install options: [INSTALL.md](./INSTALL.md)
- Design philosophy: [PHILOSOPHY.md](./PHILOSOPHY.md)
- Contributing: [CONTRIBUTING.md](./CONTRIBUTING.md)

## License

MIT — see [LICENSE](./LICENSE).
