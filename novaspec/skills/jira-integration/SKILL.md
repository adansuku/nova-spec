---
name: jira-integration
description: Read and create tasks in Jira via the REST API. Uses the project's config.yml (`jira` section).
---

# Jira Integration

Read and create issues in Jira using Atlassian's REST API v3.

## Required config in config.yml

```yaml
jira:
  skill: jira-integration
  url: https://your-org.atlassian.net   # no trailing slash
  project: PROJ                          # default project key
  email: you@email.com
  token: ${JIRA_API_TOKEN}               # reference to env variable
```

Get the token at: https://id.atlassian.com/manage-profile/security/api-tokens

## How to use this skill

When the user asks to read or create Jira tasks:

1. **Read the config**: read the project's `config.yml` and extract the `jira` section.
2. **Resolve the token**: if the value starts with `${`, read the corresponding env variable (e.g. `$JIRA_API_TOKEN`).
3. **Build Basic Auth credentials**: `base64(email:token)`.
4. **Call the API** with `curl` for the requested operation.

## Operations

### Read a ticket

```bash
curl -s \
  -H "Authorization: Basic <BASE64>" \
  -H "Accept: application/json" \
  "https://<url>/rest/api/3/issue/<TICKET_KEY>"
```

Show the user: key, summary, status (status.name), description (description.content[0].content[0].text if present), assignee (assignee.displayName).

### List tickets in a project (recent open ones)

```bash
curl -s \
  -H "Authorization: Basic <BASE64>" \
  -H "Accept: application/json" \
  "https://<url>/rest/api/3/search?jql=project=<PROJECT>+AND+statusCategory!=Done+ORDER+BY+created+DESC&maxResults=20&fields=summary,status,assignee,priority"
```

### Create a ticket

```bash
curl -s -X POST \
  -H "Authorization: Basic <BASE64>" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  "https://<url>/rest/api/3/issue" \
  -d '{
    "fields": {
      "project": { "key": "<PROJECT>" },
      "summary": "<TITLE>",
      "description": {
        "type": "doc", "version": 1,
        "content": [{"type": "paragraph", "content": [{"type": "text", "text": "<DESCRIPTION>"}]}]
      },
      "issuetype": { "name": "<TYPE>" }
    }
  }'
```

Common issue types: `Story`, `Task`, `Bug`, `Sub-task`.

After creating, show the assigned key (the `key` field in the response) and the direct URL to the ticket.

### Title convention

Default: plain summary, no prefix. If the project follows a convention (e.g. `<PROJECT>-<NNN>: <title>` with zero-padded numbers), follow it consistently. To find the next number, query the latest ticket via the search API and increment by one.

## Notes

- If `token` is not in config.yml, ask the user to set it.
- If the project is not specified in the request, use the `project` from config.yml.
- On HTTP errors (401, 403, 404), show Jira's error message but never expose it whole if it contains the token.
