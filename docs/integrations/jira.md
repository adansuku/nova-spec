---
description: Connect nova-spec to Atlassian Jira — token, project, transitions, errors.
---

# Jira integration

nova-spec ships a deterministic Jira client (`lib/jira.js`) plus a CLI subcommand and a skill that wraps it. Tokens never appear in shell commands; auth is handled inside the Node client.

## Setup

### 1. Get an API token

[id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)

Tokens are scoped to the user, not to the project. Set it once, use it for any Jira instance you have access to.

### 2. Export it in your shell

```bash
# ~/.zshrc or ~/.bashrc
export JIRA_API_TOKEN="<your-token>"
```

Or use a secret manager (1Password CLI, direnv, etc.) — anything that puts `JIRA_API_TOKEN` in the env where Claude Code runs.

### 3. Configure `novaspec/config.yml`

```yaml
ticket_system: jira

jira:
  skill: jira-integration
  url: https://your-workspace.atlassian.net   # no trailing slash
  project: PROJ                                # default project key
  email: you@example.com                       # the email tied to the token
  token: ${JIRA_API_TOKEN}                     # env-var reference

  done_transition_id: "21"                     # legacy, kept for compatibility

  transitions:
    on_pr: "21"                                # used by /nova-wrap → "Code Review"
    done:  "21"                                # legacy; nova-spec does NOT move
                                               # to Done (see below)
```

If you ran `npx nova-spec init` and chose Jira, this is generated for you.

### 4. Discover the right `on_pr` (Code Review) transition

Workflow transition IDs are workflow-specific. Run:

```bash
npx nova-spec jira transitions PROJ-1
```

This prints every transition reachable from the current status of `PROJ-1`. Pick the one that takes the ticket to your **"Code Review"** column (sometimes named "In Review", "Review", "Pull Request Open", etc.) and put its ID in `transitions.on_pr`.

The installer offers to do this interactively at the end of `init` if `JIRA_API_TOKEN` is in your env.

### Important: nova-spec does NOT move the ticket to Done

`/nova-wrap` moves the ticket to **"Code Review"** when the PR opens. It
**never** moves it to Done. The Done transition is owned by Jira's
native forge integration:

```text
You merge the PR  →  GitHub / GitLab notifies Jira (because the PR
                     mentions the ticket key in its branch name)
                  →  Jira moves the ticket to Done automatically
```

This integration is a standard feature of Atlassian's **Jira+GitHub** /
**Jira+GitLab** apps. It's set up once at the workspace level (Jira
admin → Apps → connect to your GitHub org or GitLab group), not per
project.

**If your workspace doesn't have it set up**, the ticket stays in
"Code Review" after the PR merges. Someone moves it to Done manually.
That's fine — the framework's job ends at "PR is mergeable".

## The skill: two modes in one

Everything Jira-related goes through a single skill: `novaspec/skills/jira-integration/SKILL.md`. It has two modes of operation:

### Framework mode (automatic — used by `/nova-*` commands)

The framework's slash commands invoke the deterministic CLI behind the scenes. Tokens are never visible to the LLM — they live inside the Node process and go straight to the `Authorization` header.

```bash
# Read a ticket (used by /nova-start)
npx nova-spec jira get PROJ-42

# List available transitions for a ticket
npx nova-spec jira transitions PROJ-42

# Transition a ticket (used by /nova-wrap → "Code Review")
npx nova-spec jira transition PROJ-42 21
```

Output is JSON. Exit codes are deterministic:

| Code | Meaning |
|---|---|
| 0 | Success |
| 1 | Generic error (network, parse) |
| 2 | Usage error |
| 401 | Invalid credentials |
| 404 | Ticket not found |

### User mode (interactive — invoke directly)

For ad-hoc operations the skill exposes slash commands you can invoke yourself:

```text
/jira                    # interactive menu
/jira show <TICKET>      # show ticket details (formatted)
/jira list               # your open tickets
/jira improve <TICKET>   # detect quality gaps, ask 2-4 questions, update via API
/jira comment <TICKET>   # add a comment
/jira transitions <TICKET>  # list reachable transitions (debug)
```

The headline feature is **`/jira improve`** — when you have a vague ticket and want to bring it up to scratch, the skill:

1. Reads the ticket via the safe CLI.
2. Evaluates 5 quality criteria: description substance, acceptance criteria, scope clarity, success metric, technical context.
3. Cross-references with your repo's `context/services/` and `context/decisions/` to detect what the ticket should mention but doesn't.
4. Asks you 2-4 trade-off questions to fill the gaps.
5. Drafts an improved description (Atlassian Document Format).
6. Shows you a diff and asks for confirmation.
7. PUTs the new description to Jira.

You can then run `/nova-start <TICKET>` to begin the formal flow on a properly-specified ticket.

### What the skill explicitly does NOT include

`create`, `analyze`, and `plan` are omitted on purpose:

- **Create a ticket** → use the Jira UI; ticket creation is rare and tooling adds little.
- **Analyze ticket + repo** → use `/nova-start` + `/nova-spec`. The `close-requirement` skill does the same work with stricter discipline (forces decisions to be closed before writing the spec).
- **Plan implementation** → use `/nova-spec` + `/nova-plan`. The formal flow writes a real `proposal.md` and `tasks.md` instead of a one-shot draft.

This split keeps the framework's flow as the canonical path for new work and the `jira` skill as the supporting tool for everything around it.

## How commands use it

| Command | Operation |
|---|---|
| `/nova-start <TICKET>` | `jira get <TICKET>` (auto, via CLI) |
| `/nova-wrap` | `jira transition <TICKET> <transitions.on_pr>` → "Code Review" (auto) |
| `/jira show <TICKET>` | `jira get` + formatted output |
| `/jira list` | curl to `/rest/api/3/search` with `assignee=currentUser()` |
| `/jira improve <TICKET>` | `jira get` + interactive Q&A + PUT description |
| `/jira comment <TICKET>` | POST to `/rest/api/3/issue/<KEY>/comment` |

Framework operations bifurcate on `ticket_system`. If it's `none`, neither `/nova-start`'s fetch nor `/nova-wrap`'s transition runs.

User-mode operations work regardless of `ticket_system` — they're invoked manually.

## Errors and fixes

### `Jira returned 401 Unauthorized`

The token is invalid or expired. Tokens don't auto-rotate but Atlassian sometimes rotates them after security events.

**Fix**: regenerate at [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens), update the env var.

### `Jira returned 404 for PROJ-42`

The ticket doesn't exist, or the project prefix in `config.yml` is wrong.

**Fix**: confirm the key. Try opening the ticket in a browser first.

### `Jira returned 400 on transition`

The transition ID is wrong for the current ticket state.

**Fix**: the ticket must be in a status that can transition to Done. Move it to "In Review" (or whatever your workflow expects) first, or update `transitions.done` to point at a different transition. Run `npx nova-spec jira transitions PROJ-42` to see what's currently available.

### `Couldn't reach Jira`

VPN, firewall, DNS, or your org blocks API access from your network.

**Fix**: nova-spec falls back to manual paste in `/nova-start` when this happens. For `/nova-wrap`, the ticket simply doesn't get auto-closed — you'd close it by hand.

### Token visible in command output

Should never happen with the CLI — but if you ever see a token in a `curl` command in the chat, that's a bug. The CLI passes the token only via env var to the underlying Node `https.request`. Report it.

## Self-hosted Jira

The CLI uses the standard Jira REST API v3. Self-hosted instances should work as long as:

* Your URL responds to `/rest/api/3/issue/<KEY>` and `/rest/api/3/issue/<KEY>/transitions`
* Basic Auth with email + token works (for cloud) or PAT (for Data Center)
* The instance is reachable from your network

If your self-hosted instance uses PAT instead of Basic Auth, you'll need to fork `lib/jira.js` to swap the auth header. The change is one line.

## What lives where

* `lib/jira.js` — the Node client (deterministic, never invokes the LLM)
* `lib/cli.js` → `runJira` — CLI subcommand
* `novaspec/skills/jira-integration/SKILL.md` — instructions the agent follows when the ticket-system is Jira
* `novaspec/config.yml` → `jira:` — your config

You can override any of them; sync preserves your edits.
