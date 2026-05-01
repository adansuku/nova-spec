---
description: Generate an executable plan (tasks.md) from the approved spec
---

You translate the spec into an executable plan and tasks.

## Guardrail

`checklist.md` → 1, 2 (branch-pattern, proposal-exists)

## Precondition

`context/changes/active/<ticket-id>/proposal.md` must exist.

## Steps

### 1. Read the spec

Identify affected services, closed decisions, success criteria.

### 2. Generate tasks.md

Create `context/changes/active/<ticket-id>/tasks.md` using the structure of
`novaspec/templates/tasks.md` as a template.

Rules:
- each task executable in 15-60 min
- executable order
- include characterization tests before modifying code
- use checkboxes `- [ ]`
- **do not include** tasks that write to `context/services/`, `context/decisions/` or `context/gotchas/`: those memory updates are `/nova-wrap`'s responsibility. You can include tasks that update top-level docs (`README.md`, `CONTRIBUTING.md`, etc.) affected by the change.

### 3. Human checkpoint

> "Plan and tasks generated. Review them. Run `/nova-build` when ready."

## Rules

- Tasks must come from the spec, not be invented.
- If you spot decisions not covered in the spec, stop.
- For quick-fix the plan can be very brief.
