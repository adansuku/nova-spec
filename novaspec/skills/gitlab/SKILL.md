---
name: gitlab
description: >
  GitLab operations for self-hosted or gitlab.com projects: create MRs, review MRs, check
  pipelines, list open merge requests, approve, merge. Use this skill for any GitLab interaction
  outside the formal /nova-* flow. For MR creation inside /nova-wrap, the framework uses the
  generic `forge` abstraction (supports both gh and glab); this skill is richer and team-specific.
  Commands: /gitlab, /gl-create, /gl-review <ID>, /gl-list, /gl-pipeline.
---

# GitLab

Unified GitLab operations for self-hosted or cloud projects.

## Available Commands

```
/gitlab                   # Interactive menu
/gitlab branch <TICKET>   # Create branch from Jira ticket  (shortcut: /gl-branch <TICKET>)
/gitlab create            # Create MR from current branch   (shortcut: /gl-create)
/gitlab review <ID>       # Review an existing MR           (shortcut: /gl-review <ID>)
/gitlab list              # List open MRs                   (shortcut: /gl-list)
/gitlab pipeline          # Check pipeline status           (shortcut: /gl-pipeline)
/gitlab my                # My open MRs
/gitlab assigned          # MRs assigned to me
/gitlab merge <ID>        # Merge an MR
```

## Required Configuration

```bash
export GITLAB_HOST="https://repo.libnova.com"
export GITLAB_TOKEN="glpat-your-token"
```

Optional — only needed for `/gitlab branch` (create branch from Jira ticket):

```bash
export JIRA_HOST="libnova.atlassian.net"
export JIRA_EMAIL="your-email@libnova.com"
export JIRA_API_TOKEN="your-jira-token"     # same env var as the `jira` skill and nova-spec
```

Project-level config lives in `novaspec/config.yml`:

- `branch.pattern` and `branch.types` — how branches are named
- `branch.base` — target branch for MRs (typically `develop` or `main`)
- `forge.type` — `gitlab` (auto-detected from `git remote`)

The skill reads these instead of carrying its own copy.

---

## Step 1: Verify Configuration

```bash
if [ -z "$GITLAB_TOKEN" ]; then
    echo "Error: GITLAB_TOKEN is not set."
    exit 1
fi

REMOTE_URL=$(git remote get-url origin 2>/dev/null)
PROJECT_PATH=$(echo "$REMOTE_URL" | sed -E 's|.*[:/]([^/]+/[^/]+)(\.git)?$|\1|' | sed 's/\.git$//')
PROJECT_PATH_ENCODED=$(echo "$PROJECT_PATH" | sed 's|/|%2F|g')
CURRENT_BRANCH=$(git branch --show-current)
TARGET_BRANCH=$(grep -E "^\s+base:" novaspec/config.yml | awk -F: '{gsub(/[ "]/,"",$2); print $2}')
TARGET_BRANCH=${TARGET_BRANCH:-develop}
```

`PROJECT_PATH` is auto-detected from the git remote. `TARGET_BRANCH` comes from `novaspec/config.yml → branch.base`.

---

## Step 2: Parse Command or Show Menu

If no argument is provided:

```
GitLab
──────────────────────────────────────────
Project : <PROJECT_PATH>
Branch  : <CURRENT_BRANCH>
Target  : <TARGET_BRANCH>

What would you like to do?

1. Create branch — Create branch from a Jira ticket
2. Create MR    — Create merge request from current branch
3. Review MR    — Review an existing MR
4. List MRs     — Show open merge requests
5. Pipeline     — Check pipeline status for current branch
6. My MRs       — MRs I created
7. Assigned     — MRs assigned to me
```

---

## Action: Create Branch

**Command**: `/gitlab branch <TICKET>` or `/gl-branch <TICKET>`

Creates a branch from a Jira ticket. Branch prefix comes from `branch.types` in `novaspec/config.yml` mapped against the Jira issue type.

```bash
TICKET="OA-1234"
AUTH=$(echo -n "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64 -w 0)

# Fetch ticket type and summary from Jira
curl -s "https://$JIRA_HOST/rest/api/3/issue/$TICKET" \
  -H "Authorization: Basic $AUTH" | python3 -c "
import sys, json, re
d          = json.load(sys.stdin)
issue_type = d['fields']['issuetype']['name'].lower()
summary    = d['fields']['summary'].lower()
slug       = re.sub(r'[^a-z0-9 ]', '', summary).replace(' ', '-')[:40].rstrip('-')

# Map Spanish issue types to branch prefixes.
# Adjust this map in novaspec/config.yml → branch.types when adding new types.
prefix_map = {
    'historia':   'feature',
    'tarea':      'feature',
    'error':      'bugfix',
    'incidencia': 'hotfix',
    'epic':       'feature',
    'iniciative': 'feature',
    'subtarea':   'feature',
}
prefix = prefix_map.get(issue_type, 'feature')
print(f\"{prefix}/{d['key']}-{slug}\")
"

# Get target branch from config (default: develop)
git checkout "$TARGET_BRANCH" && git pull
git checkout -b <branch-name>
```

> If the team uses `/nova-start <TICKET>` instead, the framework handles branch creation
> with the same convention (it reads `branch.types` from `novaspec/config.yml`). Use
> `/gitlab branch` when you want only the branch and not the full ticket-fetch + context-load
> of `/nova-start`.

---

## Action: Create MR

**Command**: `/gitlab create` or `/gl-create`

### Full workflow

1. Validate branch format against `branch.pattern` in `novaspec/config.yml`.
2. Push branch to remote if not yet published.
3. Read the MR body template from `novaspec/templates/pr-body.md`.
4. Build MR title from the ticket key + summary.
5. Create MR with squash enabled, targeting `branch.base` from config.

### Build MR Title

Format: `<TICKET-ID>: <one-line summary>`

For example: `OA-1234: Add rate limiting to /api/login`.

The summary should match the spec / commit, not the raw Jira title if that was vague.

### MR Body — read from the framework template

The framework provides a single MR body template at:

```
novaspec/templates/pr-body.md
```

Read it, substitute the placeholders (`<link to Jira>`, `<what changes and why>`,
`<ticket-id>`, etc.) with real values from the ticket and the diff, then post it
as the MR description. **Don't write a parallel template** — if you want to change
the structure, edit `pr-body.md` (sync respects local edits via hash-compare).

### API Call — Create MR

```bash
MR_TITLE="<TICKET-ID>: <summary>"
MR_DESCRIPTION=$(cat novaspec/templates/pr-body.md)
# (substitute placeholders in MR_DESCRIPTION first — use sed or python)

curl -s -k --request POST \
  --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  --header "Content-Type: application/json" \
  --data '{
    "source_branch": "'"$CURRENT_BRANCH"'",
    "target_branch": "'"$TARGET_BRANCH"'",
    "title": "'"$MR_TITLE"'",
    "description": "'"$MR_DESCRIPTION"'",
    "remove_source_branch": true,
    "squash": true
  }' \
  "$GITLAB_HOST/api/v4/projects/$PROJECT_PATH_ENCODED/merge_requests"
```

---

## Action: Review MR

**Command**: `/gitlab review <MR_ID>` or `/gl-review <MR_ID>`

1. Fetch MR details (title, author, branch, description).
2. Check pipeline status.
3. List changed files.
4. Offer actions: view diff, add comment, approve.

### Fetch MR Details

```bash
curl -s -k --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  "$GITLAB_HOST/api/v4/projects/$PROJECT_PATH_ENCODED/merge_requests/$MR_IID"
```

### Check Pipeline

```bash
curl -s -k --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  "$GITLAB_HOST/api/v4/projects/$PROJECT_PATH_ENCODED/merge_requests/$MR_IID/pipelines"
```

### Get Changes

```bash
curl -s -k --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  "$GITLAB_HOST/api/v4/projects/$PROJECT_PATH_ENCODED/merge_requests/$MR_IID/changes"
```

### Approve MR

```bash
curl -s -k --request POST --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  "$GITLAB_HOST/api/v4/projects/$PROJECT_PATH_ENCODED/merge_requests/$MR_IID/approve"
```

### Add Comment

```bash
curl -s -k --request POST \
  --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  --header "Content-Type: application/json" \
  --data '{"body": "'"$COMMENT"'"}' \
  "$GITLAB_HOST/api/v4/projects/$PROJECT_PATH_ENCODED/merge_requests/$MR_IID/notes"
```

---

## Action: List MRs

**Command**: `/gitlab list` or `/gl-list`

```bash
curl -s -k --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  "$GITLAB_HOST/api/v4/projects/$PROJECT_PATH_ENCODED/merge_requests?state=opened&per_page=10" \
  | python3 -c "
import sys, json
mrs = json.load(sys.stdin)
print('Open MRs:')
print('─' * 60)
for mr in mrs:
    print(f\"  !{mr['iid']:4} | {mr['title'][:45]}\")
    print(f\"        {mr['source_branch']} → {mr['target_branch']}\")
"
```

---

## Action: Pipeline Status

**Command**: `/gitlab pipeline` or `/gl-pipeline`

```bash
curl -s -k --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  "$GITLAB_HOST/api/v4/projects/$PROJECT_PATH_ENCODED/pipelines?ref=$CURRENT_BRANCH&per_page=1" \
  | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data:
    p = data[0]
    status_map = {
        'success':  '✓ Passed',
        'failed':   '✗ Failed',
        'running':  '⟳ Running',
        'pending':  '◷ Pending',
        'canceled': '⊘ Canceled'
    }
    print(f\"Pipeline #{p['id']}: {status_map.get(p['status'], p['status'])}\")
    print(f\"URL: {p['web_url']}\")
else:
    print('No pipelines found for this branch')
"
```

---

## Action: My MRs

**Command**: `/gitlab my`

```bash
curl -s -k --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  "$GITLAB_HOST/api/v4/merge_requests?state=opened&scope=created_by_me&per_page=10" \
  | python3 -c "
import sys, json
mrs = json.load(sys.stdin)
print('My open MRs:')
print('─' * 60)
for mr in mrs:
    print(f\"  !{mr['iid']:4} | {mr['title'][:45]}\")
    print(f\"        {mr['references']['full']} — {mr['web_url']}\")
"
```

---

## Action: Assigned to Me

**Command**: `/gitlab assigned`

```bash
curl -s -k --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  "$GITLAB_HOST/api/v4/merge_requests?state=opened&scope=assigned_to_me&per_page=10" \
  | python3 -c "
import sys, json
mrs = json.load(sys.stdin)
print('MRs assigned to me:')
print('─' * 60)
for mr in mrs:
    print(f\"  !{mr['iid']:4} | {mr['title'][:45]}\")
    print(f\"        {mr['references']['full']} — {mr['web_url']}\")
"
```

---

## Action: Merge MR

**Command**: `/gitlab merge <MR_ID>`

```bash
curl -s -k --request PUT --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  "$GITLAB_HOST/api/v4/projects/$PROJECT_PATH_ENCODED/merge_requests/$MR_IID/merge?squash=true"
```

---

## Technical Notes

- Always use `-k` in curl for self-hosted GitLab on internal CAs (SSL verification often fails in WSL / corporate networks). Drop `-k` for `gitlab.com`.
- MR descriptions must be in English.
- Never include AI or Claude references in MR content.
- This skill is **independent** of the framework's `forge` abstraction. Both can coexist:
  - `/nova-wrap` uses `forge pr-command` for portability (works with GitHub too).
  - `/gitlab create` uses this skill for richer team-specific behavior (templates, squash, target branch from config).
- Branch naming + MR title format **read from `novaspec/config.yml`** — change the convention there, not in this skill.
