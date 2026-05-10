---
name: jira-integration
description: Read and transition tickets in Jira via the deterministic `npx nova-spec jira` CLI. Reads `config.yml`'s jira section automatically.
---

# Jira Integration

Read and transition Jira issues using the bundled CLI. The CLI handles auth,
URL building, and JSON parsing — never paste tokens into shell commands.

## Required config in config.yml

```yaml
jira:
  skill: jira-integration
  url: https://your-org.atlassian.net    # no trailing slash
  project: PROJ                           # default project key
  email: you@email.com
  token: ${JIRA_API_TOKEN}                # reference to env variable
  done_transition_id: "41"                # numeric ID
  transitions:
    done: "41"                            # same value, structured form
```

Get the token at: https://id.atlassian.com/manage-profile/security/api-tokens

## Operations

### Read a ticket

```bash
npx nova-spec jira get <TICKET-KEY>
```

Output: full JSON. Show the user: key, summary, status, description, assignee.

### List transitions for a ticket

```bash
npx nova-spec jira transitions <TICKET-KEY>
```

Use this when `done_transition_id` is missing or wrong, to discover the right ID.

### Transition a ticket

```bash
npx nova-spec jira transition <TICKET-KEY> <TRANSITION-ID>
```

For closing as Done at end of `/nova-wrap`, read `jira.transitions.done`
(or fall back to `jira.done_transition_id`) from `config.yml`.

## Error handling

The CLI exits with these codes:
- `0`  — success
- `1`  — generic error (network, parse, etc.)
- `2`  — usage error (missing args)
- `401` — invalid credentials → ask user to regenerate `JIRA_API_TOKEN`
- `404` — ticket not found → confirm the key with the user

When the CLI prints `✗ Jira 401`, do NOT retry — credentials are wrong.

## Notes

- Never paste the token into a shell command. The CLI reads it from
  `JIRA_API_TOKEN` env var, resolved via the `${JIRA_API_TOKEN}` reference
  in `config.yml`.
- If the token env var is missing, the CLI fails fast with a clear message.
- For one-off direct curl calls (debugging only), build Basic Auth via
  `AUTH=$(printf '%s' "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)` — never
  inline the token.
