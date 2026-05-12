---
name: jira-integration
description: >
  Single skill for ALL Jira operations — both automatic (used by /nova-start to fetch
  tickets, by /nova-wrap to transition them) and user-invoked. Reads tickets, improves
  vague tickets with interactive questions, lists open tickets, adds comments, transitions.
  Framework operations always use the deterministic `npx nova-spec jira` CLI (token never
  in shell history). Richer agentic operations use the same CLI when available and curl
  for the rest. Use /jira to start an interactive session.
---

# Jira Integration

One skill, two modes of use:

1. **Framework mode** (automatic) — `/nova-start` and `/nova-wrap` invoke this skill behind the scenes to fetch ticket data and transition tickets. You don't call anything; the framework does.
2. **User mode** (interactive) — when you want to manually read, improve, list, or comment on tickets, invoke `/jira <action>`.

Both modes share the same underlying CLI (`npx nova-spec jira ...`) so credentials stay inside the Node process — never on the command line, never in shell history.

## Available commands (user mode)

```
/jira                    # Interactive menu
/jira show <TICKET>      # Show ticket details (formatted)
/jira list               # My open tickets
/jira improve <TICKET>   # Read ticket, detect gaps, ask 2-4 questions, update via API
/jira comment <TICKET>   # Add a comment
/jira transitions <TICKET>  # List reachable transitions (for debugging)
```

> Not included on purpose: `create`, `analyze`, `plan`. They overlap with `/nova-start`,
> `/nova-spec`, and `/nova-plan`. The framework flow is the canonical path for those.

## Required configuration

```bash
export JIRA_HOST="libnova.atlassian.net"   # no https:// prefix
export JIRA_EMAIL="email@libnova.com"
export JIRA_API_TOKEN="your-api-token"
```

Token: https://id.atlassian.com/manage-profile/security/api-tokens

The project key lives in `novaspec/config.yml → jira.project`. The skill reads it from there.

---

## Framework integration (automatic — don't worry about this)

### From `/nova-start`

The flow calls:

```bash
npx nova-spec jira get <TICKET-KEY>
```

The CLI returns the full JSON. The framework extracts `key`, `summary`, `status`, `description`, `assignee`, `subtasks` and passes them into the agent's context.

Exit codes:

| Code | Meaning |
|---|---|
| 0   | Success |
| 401 | Invalid credentials — regenerate token |
| 404 | Ticket not found — check project prefix |
| 1/2 | Network, parse, or usage error |

### From `/nova-wrap`

The flow calls:

```bash
npx nova-spec jira transitions <TICKET-KEY>     # discover IDs
npx nova-spec jira transition <TICKET-KEY> <ID> # apply
```

The transition ID comes from `config.yml → jira.transitions.on_pr` (which moves the ticket to "Code Review"). The framework reads it; the skill executes it.

---

## User mode: show ticket

**Command**: `/jira show <TICKET>`

Fetches via the safe CLI, then displays formatted output.

```bash
TICKET="OA-1234"
npx nova-spec jira get "$TICKET" | python3 -c "
import sys, json

def extract_text(node):
    if not node: return ''
    if isinstance(node, str): return node
    if node.get('type') == 'text': return node.get('text', '')
    parts = [extract_text(c) for c in node.get('content', [])]
    sep = '\n' if node.get('type') in ('paragraph','bulletList','orderedList','listItem') else ''
    return sep.join(parts)

d = json.load(sys.stdin)
f = d['fields']
print(f\"Key      : {d['key']}\")
print(f\"Summary  : {f['summary']}\")
print(f\"Type     : {f['issuetype']['name']}\")
print(f\"Status   : {f['status']['name']}\")
print(f\"Priority : {f.get('priority', {}).get('name', 'None')}\")
print(f\"Assignee : {f.get('assignee', {}).get('displayName', 'Unassigned')}\")
print()
desc = f.get('description')
if desc:
    print('Description:')
    print(extract_text(desc))
if f.get('subtasks'):
    print()
    print('Subtasks:')
    for s in f['subtasks']:
        print(f\"  - [{s['fields']['status']['name']}] {s['key']}: {s['fields']['summary']}\")
"
```

---

## User mode: list my open tickets

**Command**: `/jira list`

For listing, the CLI doesn't have a built-in op, so use curl (read-only — token risk is low):

```bash
HOST="https://$JIRA_HOST"
AUTH=$(echo -n "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64 -w 0)   # -w 0 prevents wrapping
JQL="assignee%3DcurrentUser()%20AND%20status%20NOT%20IN%20(Done%2CClosed)%20ORDER%20BY%20updated%20DESC"

curl -s "$HOST/rest/api/3/search?jql=$JQL&maxResults=20" \
  -H "Authorization: Basic $AUTH" | python3 -c "
import sys, json
data = json.load(sys.stdin)
issues = data.get('issues', [])
print(f'Open tickets ({len(issues)}):')
print('─' * 60)
for i in issues:
    f = i['fields']
    print(f\"  {i['key']:10} [{f['issuetype']['name']:8}] {f['status']['name']:15} {f['summary'][:40]}\")
"
```

> **Note on `base64 -w 0`**: without `-w 0` base64 wraps at 76 chars, corrupting the Authorization header. macOS `base64` doesn't have `-w` — use `base64 | tr -d '\n'` instead.

---

## User mode: improve a vague ticket (key feature)

**Command**: `/jira improve <TICKET>`

This is the main reason this skill exists beyond the framework primitives.

### Step 1 — Read the ticket

```bash
npx nova-spec jira get <TICKET>
```

### Step 2 — Detect quality gaps

Evaluate the ticket against these criteria. Each missing one is a gap to address:

| Criterion | Gap signal |
|---|---|
| Description has substance | Empty, less than 50 chars, or only "fix bug" / "improve thing" |
| Acceptance criteria exist | No `[ ]` task list, no "AC:" section, no "Definition of done" |
| Scope is clear | No mention of which file/module/service, or "should be reusable" without context |
| Success criteria is verifiable | Vague: "improve performance" without metric, "look nicer" without spec |
| Technical context | No file names, component names, or API paths mentioned for a ≥feature-sized ticket |

Also cross-check against repo memory:
- `context/services/<svc>.md` — does the ticket clearly map to a service?
- `context/decisions/` — does it touch a documented decision that constrains the approach?

### Step 3 — Ask 2-4 questions

Choose 2-4 gaps (don't overwhelm). Format questions as **trade-offs** when possible:

```
Algunos huecos en este ticket que me ayudaría cerrar:

1. SCOPE: ¿afecta solo a /api/login o también a /api/refresh?
   (recomendado: solo /api/login si quieres mantener el alcance estrecho)

2. SUCCESS CRITERIA: "mejorar performance" — ¿qué métrica vas a usar?
   a) P95 < 200ms en el endpoint
   b) Reducir un X% el throughput
   c) Otra

3. ACCEPTANCE CRITERIA: ¿qué tests añadimos?
   a) Solo unit tests del rate limiter
   b) + integration test con un Redis fake
   c) + load test con K6
```

Wait for answers. Don't draft anything until the user replies.

### Step 4 — Draft improved description

Build an ADF document with sections:

```
## Context
<from original ticket + repo context>

## Scope
<from question 1>

## Acceptance Criteria
- [ ] <derived from question 3>
- [ ] <other concrete checks>

## Success metric
<from question 2>

## Notes
<any subtle gotchas detected from repo memory>
```

### Step 5 — Show diff and confirm

```
PROPUESTA DE MEJORA — OA-1234
──────────────────────────────────────────────────

CAMBIA:
  Description: <original snippet>
  Acceptance Criteria: (no había)

A:
  Description: (más concreto, ver abajo)
  Acceptance Criteria: 3 nuevos items con paths reales

¿Aplicar la mejora al ticket en Jira? [s/n/editar]
```

### Step 6 — Apply via API

If confirmed, PUT the new description:

```bash
HOST="https://$JIRA_HOST"
AUTH=$(echo -n "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64 -w 0)

# Build ADF_BODY in python first (never hand-edit JSON):
ADF_BODY=$(python3 <<'PY'
import json
doc = {
  "type": "doc",
  "version": 1,
  "content": [
    {"type": "heading", "attrs": {"level": 2},
     "content": [{"type": "text", "text": "Context"}]},
    {"type": "paragraph",
     "content": [{"type": "text", "text": "<context text from agent>"}]},
    {"type": "heading", "attrs": {"level": 2},
     "content": [{"type": "text", "text": "Acceptance Criteria"}]},
    {"type": "taskList", "attrs": {"localId": "ac"},
     "content": [
       {"type": "taskItem", "attrs": {"localId": "1", "state": "TODO"},
        "content": [{"type": "paragraph",
                     "content": [{"type": "text", "text": "First criterion"}]}]}
     ]}
  ]
}
print(json.dumps(doc))
PY
)

curl -s -X PUT "$HOST/rest/api/3/issue/<TICKET>" \
  -H "Authorization: Basic $AUTH" \
  -H "Content-Type: application/json" \
  -d "{\"fields\": {\"description\": $ADF_BODY}}"
```

### Step 7 — Confirm

> "Ticket OA-1234 mejorado. Description y AC actualizadas. Puedes seguir con `/nova-start OA-1234` para arrancar el flujo formal."

---

## User mode: add a comment

**Command**: `/jira comment <TICKET>`

Ask the user for the comment text, then POST as a paragraph ADF:

```bash
HOST="https://$JIRA_HOST"
AUTH=$(echo -n "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64 -w 0)
COMMENT_TEXT="<lo que el usuario quiera comentar>"

ADF_BODY=$(python3 -c "
import json, sys
text = '''$COMMENT_TEXT'''
print(json.dumps({
  'type': 'doc',
  'version': 1,
  'content': [{'type': 'paragraph', 'content': [{'type': 'text', 'text': text}]}]
}))
")

curl -s -X POST "$HOST/rest/api/3/issue/<TICKET>/comment" \
  -H "Authorization: Basic $AUTH" \
  -H "Content-Type: application/json" \
  -d "{\"body\": $ADF_BODY}"
```

---

## ADF templates (inline)

Jira API v3 requires ADF (Atlassian Document Format) for description and comment bodies. Build these programmatically in Python — don't hand-edit JSON.

### Paragraph (for comments)

```json
{
  "type": "doc",
  "version": 1,
  "content": [
    { "type": "paragraph",
      "content": [{ "type": "text", "text": "Your text here" }] }
  ]
}
```

### Description with sections and task list

```json
{
  "type": "doc",
  "version": 1,
  "content": [
    { "type": "heading", "attrs": { "level": 2 },
      "content": [{ "type": "text", "text": "Context" }] },
    { "type": "paragraph",
      "content": [{ "type": "text", "text": "What changes and why." }] },
    { "type": "heading", "attrs": { "level": 2 },
      "content": [{ "type": "text", "text": "Acceptance Criteria" }] },
    { "type": "taskList", "attrs": { "localId": "ac" },
      "content": [
        { "type": "taskItem", "attrs": { "localId": "1", "state": "TODO" },
          "content": [{ "type": "paragraph",
                        "content": [{ "type": "text", "text": "First criterion" }] }] }
      ]
    }
  ]
}
```

---

## Rules

- **For `/nova-start` and `/nova-wrap`** — always use the CLI (`npx nova-spec jira ...`). Token never on command line.
- **For user-invoked read operations** (list, show) — curl is acceptable. Token in header only, not on argv.
- **For user-invoked WRITE operations** (improve, comment) — same: curl with header auth, but **always confirm before PUT/POST**.
- **Use `base64 -w 0`** (Linux) or `base64 | tr -d '\n'` (macOS) to avoid line-wrap corrupting the header.
- **Error handling**: a 401 means the token is invalid — tell the user to regenerate at `https://id.atlassian.com/manage-profile/security/api-tokens`. Don't retry.
- **Cross-reference with repo memory** when improving tickets: `context/services/` and `context/decisions/` are usually richer than the ticket itself.
- The CLI's exit codes (0/1/2/401/404) are the canonical contract — don't try to parse error messages from stdout.
