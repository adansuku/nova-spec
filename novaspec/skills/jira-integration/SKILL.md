---
name: jira-integration
description: Read and transition Jira tickets via the deterministic `npx nova-spec jira` CLI. The CLI handles auth so tokens never appear in shell commands.
---

# Jira Integration

This skill is a thin wrapper around the `npx nova-spec jira` subcommand,
which is a small Node-based HTTP client. **Never build `curl` calls by hand**
— the CLI keeps the `JIRA_API_TOKEN` inside the Node process and never
inlines it on a command line.

## Required config in `novaspec/config.yml`

```yaml
ticket_system: jira

jira:
  skill: jira-integration
  url: https://your-workspace.atlassian.net   # no trailing slash
  project: PROJ                                # default project key
  email: you@example.com                       # tied to the token
  token: ${JIRA_API_TOKEN}                     # env-var reference
  done_transition_id: "41"                     # legacy, kept for fallback
  transitions:
    done: "41"                                 # preferred form, used by /nova-wrap
```

Get the token at: https://id.atlassian.com/manage-profile/security/api-tokens

## Operations

### Read a ticket

```bash
npx nova-spec jira get <TICKET-KEY>
```

Output is JSON. Extract: `key`, `fields.summary`, `fields.status.name`,
`fields.description`, `fields.assignee.displayName`.

### List transitions for a ticket

```bash
npx nova-spec jira transitions <TICKET-KEY>
```

Use this when `transitions.done` is missing or wrong: it tells you which
transitions are reachable from the current ticket status, and their IDs.

### Transition a ticket (close as Done from `/nova-wrap`)

```bash
npx nova-spec jira transition <TICKET-KEY> <TRANSITION-ID>
```

Read `<TRANSITION-ID>` from `novaspec/config.yml` → `jira.transitions.done`.
Fall back to `jira.done_transition_id` if the structured form is missing.

## Error handling

The CLI exits with:

| Code | Meaning | What to do |
|---|---|---|
| 0   | Success | Continue |
| 1   | Generic error (network, parse) | Surface the message; offer manual fallback |
| 2   | Usage error (missing arg) | Fix the command and retry |
| 401 | Invalid credentials | Tell user to regenerate `JIRA_API_TOKEN` — **do NOT retry** |
| 404 | Ticket not found | Confirm the key with the user |

When the CLI prints `✗ Jira 401`, never retry — credentials are wrong.

## Rules

- **Never** paste the token into a `curl` command. The CLI reads it from
  `JIRA_API_TOKEN` env var via the `${JIRA_API_TOKEN}` reference in `config.yml`.
- If `JIRA_API_TOKEN` is missing, the CLI fails fast with `✗ JIRA_API_TOKEN env var is not set.`
- For debugging only (and never with a real token visible), you can build
  Basic Auth via `AUTH=$(printf '%s' "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)` —
  but the CLI is always preferable.
