---
description: Close the ticket — update memory, archive spec, commit and PR
---

This is the step that feeds architectural memory.
**Without this step, the system doesn't learn.**

## Guardrail

`checklist.md` → 0, 1, 5, 6 (nova-installed, branch-pattern, review-approved, old-decision-archived)

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

### 6. Create PR / MR (forge-agnostic)

Resolve the base branch the same way `/nova-start` does:
- Read `branch.base` from `novaspec/config.yml`.
- If the key is missing, try `develop`; if that doesn't exist either, ask
  the user and recommend setting `branch.base` in `novaspec/config.yml`.

**Do NOT hardcode `gh`.** Ask the CLI to build the right command for the
forge (`gh pr create ...` for GitHub, `glab mr create ...` for GitLab):

```bash
npx nova-spec forge pr-command "<TICKET-ID>: <title>" "<description>" "<base>"
```

The CLI also verifies the forge binary is installed; if it isn't, it exits
with code 127 and a clear error. Show the user the command, get confirmation,
then execute it.

For user-facing messages use the right vocabulary (PR vs MR):
```bash
TERM=$(npx nova-spec forge term)
```

**Title**: `<TICKET-ID>: <title>`

**Description**: use the structure of `novaspec/templates/pr-body.md` as a template.

### 7. Close the ticket in Jira

If `novaspec/config.yml` has `jira.skill` set (and `ticket_system: jira`), invoke the `jira-integration` skill to transition the ticket to "Done".

The transition ID to use is `jira.transitions.done` from `novaspec/config.yml`. If that key is missing, fall back to the legacy `jira.done_transition_id`. The skill (or `npx nova-spec jira transition <TICKET> <id>` directly) handles the API call.

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
