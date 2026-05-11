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
  done_transition_id: "41"                     # legacy, kept for compatibility
  transitions:
    done: "41"                                 # used by /nova-wrap
```

If you ran `npx nova-spec init` and chose Jira, this is generated for you.

### 4. Discover the right `done` transition

Workflow transition IDs are workflow-specific — `41` is from Atlassian's sandbox and almost certainly wrong for your instance. Run:

```bash
npx nova-spec jira transitions PROJ-1
```

This prints every transition available from the current status of `PROJ-1` (so the ticket needs to be in a state where "Done" is reachable). Pick the one named "Done" / "Cerrado" / "Closed" and put its ID in `transitions.done`.

The installer offers to do this interactively at the end of `init` if `JIRA_API_TOKEN` is in your env.

## Operations

The CLI subcommand wraps three operations:

```bash
# Read a ticket
npx nova-spec jira get PROJ-42

# List available transitions for a ticket
npx nova-spec jira transitions PROJ-42

# Transition a ticket (e.g. close it)
npx nova-spec jira transition PROJ-42 41
```

Output is JSON. Exit codes are deterministic:

| Code | Meaning |
|---|---|
| 0 | Success |
| 1 | Generic error (network, parse) |
| 2 | Usage error |
| 401 | Invalid credentials |
| 404 | Ticket not found |

The skill (`novaspec/skills/jira-integration/SKILL.md`) tells the agent to use this CLI rather than building `curl` calls by hand. Tokens are never visible to the LLM.

## How commands use it

| Command | Operation |
|---|---|
| `/nova-start <TICKET>` | `jira get <TICKET>` to fetch title/description/AC |
| `/nova-wrap` | `jira transition <TICKET> <transitions.done>` to close the ticket |

Both bifurcate on `ticket_system`. If it's `none`, neither call is made.

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
