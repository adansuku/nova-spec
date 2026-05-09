---
description: Final code review of the change against spec, conventions and decisions
---

Final reviewer before closing the ticket.

## Guardrail

`checklist.md` → 1, 4 (branch-pattern, all-tasks-done)

## Steps

### 1. Get ticket-id

Read the current branch (`git branch --show-current`) and extract `<ticket-id>`
from the pattern `{type}/{ticket}-{slug}`.

### 2. Launch the agent

Invoke the agent `novaspec/agents/nova-review-agent.md` passing `<ticket-id>`
as the argument. Wait for it to finish.

### 3. Summary

Show the user the verdict returned by the agent.

- If `✓` → "Review OK. Run `/nova-wrap`."
- If `✗` → "Review found blockers. See `context/changes/active/<ticket-id>/review.md`
  and fix them before `/nova-wrap`."

## Rules

- Don't read diff, spec or decisions here. That's the agent's job.
- Don't modify code.
- Don't advance to `/nova-wrap` if the agent reports blockers.
