---
name: close-requirement
description: Turn a vague ticket into a closed requirement with structured questions.
---

# Close requirement

Transform a vague ticket into a requirement with closed decisions.

## Prior context

Read before asking:
- `context/services/<service>.md`
- 3-5 files from `context/decisions/` whose name is relevant to the ticket (never `archived/`)
- Files from `context/gotchas/` if any are relevant

## Steps

### 1. Understand the ask

What they want, what problem it solves, what's unclear.

### 2. Clarifying questions

Goal: force decisions, don't explore.

- conversational tone, max 3 questions per turn
- prefer trade-offs (A vs B) over open-ended
- include a suggested default anchored in the code

### Mandatory dimensions

1. Shape of the solution
2. Expected output
3. Behavior (normal, edge, failure)
4. Actor and context
5. Scope
6. Success criteria

### 3. Iterate until closed

Don't advance if there are open decisions.

### 4. Confirm before drafting

> "All clear. Should I draft the final requirement?"

## Output

Template: `novaspec/templates/proposal.md` (use it after confirmation)

## Rules

- Don't write code
- Don't assume missing decisions
- Don't draft if there are open decisions
