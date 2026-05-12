---
description: Install nova-spec and run your first ticket end to end.
---

# Getting started

## 1. Install

```bash
npx nova-spec init
```

The wizard asks five things:

| Prompt | What it means |
|---|---|
| **Scope** | `project` (only this repo) or `global` (all your projects via `~/.claude`). Pick `project` if your team will share customizations. |
| **Runtime** | Claude Code, OpenCode, or both. The installer creates symlinks into `.claude/` and/or `.opencode/`. |
| **Ticket system** | `jira` or `none`. Pick `none` if you paste tickets manually — the format check in `/nova-start` becomes free-form. |
| **Forge** | `auto`, `github`, `gitlab`, or `none`. Auto-detected from `git remote get-url origin` if you leave it on `auto`. |
| **Base branch** | The branch new ticket branches are cut from (default: `main`). |

If you pick Jira and `JIRA_API_TOKEN` is in your env, the installer offers to **list your project's transitions via the API** so you can pick "Done" by name instead of guessing the ID.

## 2. What got installed

```text
.
├── novaspec/              # framework files — edit any of them in place
│   ├── commands/          # /nova-* slash commands
│   ├── skills/            # auxiliary skills (Jira, close-requirement, ...)
│   ├── agents/            # context-loader, nova-review-agent
│   ├── templates/         # pr-body.md, commit.md, proposal.md, ...
│   ├── guardrails/        # checklist.md + .sh scripts
│   ├── config.yml         # your project config (gitignored)
│   └── .nova-manifest.json # tracks last-shipped hashes (gitignored)
│
├── context/               # architectural memory (project install only)
│   ├── stack.md           # describe your tech stack
│   ├── conventions.md     # describe your patterns
│   ├── decisions/         # one fact = one file
│   ├── gotchas/
│   ├── services/
│   └── changes/active/    # in-progress specs land here
│
├── .claude/               # symlinks → ../novaspec/{commands,skills,agents}
│   └── settings.local.json # SessionStart hook auto-runs `nova-spec sync`
│
├── AGENTS.md              # repo anchor — first thing the agent reads
└── notes.md               # scratch pad
```

The installer **does not** overwrite an existing `CLAUDE.md`. If you have one, yours wins.

## 3. Fill in stack & conventions

Open `context/stack.md` and `context/conventions.md`. Both are pre-populated with HTML comments explaining what to put inside. Examples:

```markdown
# Stack
## Language & runtime
- Node.js 20.x

## Framework
- Next.js 14 (App Router)

## Key dependencies
- PostgreSQL 16, Redis 7
```

```markdown
# Conventions
## Code style
- 2-space indent, single quotes
- functional components only

## Patterns we avoid
- no global mutable state
- no `any` in TypeScript
```

These two files are loaded by `context-loader` at the start of **every** ticket so the agent matches your stack and style without you having to re-explain them.

## 4. First ticket

Open Claude Code (or OpenCode) at the repo root and run:

```text
/nova-start PROJ-42
```

What you should see:

```text
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

No code yet. The agent classified the ticket, created the branch, and loaded only the context that matters. Continue with `/nova-spec` (or jump straight to `/nova-build` if it's a `quick-fix`).

## 5. The full flow on one screen

```text
/nova-start TICKET    →  classify, branch, load context
/nova-spec            →  close requirements, write proposal.md
/nova-plan            →  translate spec into tasks.md
/nova-build           →  execute tasks one by one
/nova-review          →  deterministic checks + 4-axis LLM review
/nova-wrap            →  memory update, archive spec, commit, PR/MR
/nova-rework          →  apply reviewer feedback rounds, push to existing PR
```

Each step blocks the next via a guardrail. See [Flow → Overview](flow/overview.md) for the full graph including which skills and agents each command invokes.

### Bootstrapping an existing codebase

If you installed nova-spec on a repo that **already has code**, the
`context/` directory is empty after init. You have two options:

1. **Recommended: run `/nova-seed`** once. It scans your repo, drafts
   `stack.md`, `conventions.md`, and a `context/services/<svc>.md` per
   detected service. You approve each draft. Takes 15-30 minutes. See
   [`/nova-seed`](flow/nova-seed.md).
2. **Or let the memory grow ticket-by-ticket** via `/nova-wrap`. Slower
   payoff (useful only after a few months), but no upfront work.

For greenfield projects, skip `/nova-seed` — there's nothing to scan yet.

## 6. Stay up to date

`npx nova-spec sync` runs **automatically every time Claude Code or OpenCode start** via a `SessionStart` hook installed in `.claude/settings.local.json`. You can also run it manually:

```bash
npx nova-spec sync
```

The sync report tells you what was updated, what was skipped because you edited it locally, and what was removed upstream. Local edits are always preserved.

## 7. When something goes wrong

* **Jira returns 401** → regenerate `JIRA_API_TOKEN`. See [Integrations → Jira](integrations/jira.md).
* **`gh: command not found`** → install GitHub CLI or set `forge.cli` in `config.yml`. See [Integrations → Forge](integrations/forge.md).
* **Branch doesn't match the pattern** → check `branch.types` in `config.yml`. See [Reference → config.yml](reference/config-yml.md).
* **Anything else** → [Troubleshooting](troubleshooting.md).
