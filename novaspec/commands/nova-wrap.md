---
description: Close the ticket — update memory, archive spec, commit and PR
---

This is the step that feeds architectural memory.
**Without this step, the system doesn't learn.**

## Guardrail

`checklist.md` → 1, 5, 6 (branch-pattern, review-approved, old-decision-archived)

## Precondition

- `/nova-review` with `✓` verdict
- No pending blockers

## Steps

### 1. Detect architectural decision

If a real decision was made with an alternative and trade-off, invoke the `write-decision` skill.

> "Should we document this decision?
>  - Yes, create `context/decisions/<concept>.md`
>  - No, no real alternative / it's cosmetic
>  - Supersedes an existing decision → name of the old file"

If supersede: the new file includes `> Supersedes: <old>.md` and run `git mv context/decisions/<old>.md context/decisions/archived/<old>.md`. Guardrail #6 validates this invariant.

### 2. Update service

For every modified service whose public interface changed, invoke the `update-service-context` skill.

> "Did service X's public interface change?
>  - Yes, rewrite `context/services/<svc>.md` (≤80 lines, replace, don't accumulate)
>  - No, internal change without external impact"

### 3. Gotcha discovered

> "Did you discover during the build something counterintuitive that another person would rediscover?
>  - Yes → add `context/gotchas/<concept>.md` (atomic, brief)
>  - No"

Default: don't write. Most tickets don't generate a gotcha.

### 4. Archive the spec

- Move `context/changes/active/<ticket-id>/` → `context/changes/archive/<ticket-id>/`

### 5. Commit

Use the structure of `novaspec/templates/commit.md` as a template.
If there are many changes, propose grouping into logical commits.

### 6. Create PR

Resolve the base branch the same way `/nova-start` does:
- Read `branch.base` from `novaspec/config.yml`.
- If the key is missing, try `develop`; if that doesn't exist either, ask
  the user and recommend setting `branch.base` in `novaspec/config.yml`.

Create the PR with `gh pr create --base <resolved-base> --title "<title>"
--body "<description>"`.

**Title**: `<TICKET-ID>: <title>`

**Description**: use the structure of `novaspec/templates/pr-body.md` as a template.

### 7. Close the ticket in Jira

If `novaspec/config.yml` has `jira.skill` set, invoke the `jira-integration` skill to transition the ticket to "Done".

Read `jira.transitions.done` from the config — it's the workflow-specific transition ID. **If missing or empty**, list the available transitions and ask the user which one means "Done" (one-time setup) before proceeding:

```bash
# One-time discovery
curl -s -u "<email>:<token>" \
  "https://<jira-url>/rest/api/3/issue/<TICKET-ID>/transitions"
```

After confirming the ID, recommend the user save it under `jira.transitions.done` in `novaspec/config.yml` so this step doesn't ask again.

Then transition the ticket:

```bash
AUTH=$(echo -n "<email>:<token>" | base64)
curl -s -X POST \
  -H "Authorization: Basic $AUTH" \
  -H "Content-Type: application/json" \
  "https://<jira-url>/rest/api/3/issue/<TICKET-ID>/transitions" \
  -d '{"transition": {"id": "<jira.transitions.done>"}}'
```

Confirm to the user: "Ticket <TICKET-ID> marked as Done in Jira ✓"

### 8. Final summary

```
## Ticket <TICKET-ID> closed

- Spec archived: <path>
- Decisions created: <list or "none">
- Gotchas added: <list or "none">
- Services updated: <list or "none">
- Commits: <count>
- PR: <link>
- Jira: <TICKET-ID> → Done ✓ (or "Jira not configured")
```

## Rules

- Don't skip the memory step.
- If the user says "no" to everything, warn: "we're closing without memory, are you sure?"
- Don't run commits or PR without confirmation.
- If something fails, stop and report.
