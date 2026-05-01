---
description: Generate the spec for the change from the ticket and loaded context
---

You are responsible for generating the technical spec of the current ticket.

## Guardrail

`checklist.md` → 1 (branch-pattern)

## Precondition

`/nova-start` must have been run first. If you don't see a created branch
and loaded context, ask the user to run `/nova-start <TICKET>` first.

## Steps

### 1. Invoke close-requirement

Invoke the `close-requirement` skill.
**Do not move to step 2 until the user confirms** that the decisions are closed.

### 2. Write the spec

Create `context/changes/active/<ticket-id>/proposal.md` using the structure
of `novaspec/templates/proposal.md` as a template.

### 3. Human checkpoint

Show the spec and say:

> "Spec generated at `context/changes/active/<ticket-id>/proposal.md`.
>  Review it before `/nova-plan`."

Don't auto-advance.

## Rules

- Don't write the spec without going through `close-requirement`.
- If the ticket is a quick-fix, warn: "are you sure it needs a formal spec?"
- If the file already exists, ask whether to overwrite.
