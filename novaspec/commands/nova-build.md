---
description: Implement tasks one by one with incremental review
---

You execute `tasks.md` in order, task by task.

## Guardrail

`checklist.md` → 1, 3 (branch-pattern, tasks-exist)

## Precondition

`context/changes/active/<ticket-id>/tasks.md` must exist.

**Exception**: if the ticket is `quick-fix`, you can operate without tasks.md.
Implement directly and skip to step 4.

## Steps

### 1. Read tasks.md

Find the first unchecked task (`- [ ]`).
If all are checked, say: "run `/nova-review`".

### 2. Execute one task

- Read relevant files before modifying
- Implement the change
- Follow the surrounding repo's conventions
- Characterization tests: write them before touching production code

Don't modify outside the task's scope. If needed, ask.

### 3. Incremental review

- Does it meet the criterion?
- Have I broken anything adjacent?
- Does it follow conventions?
- Any unintended effects?

If there's a problem, fix it before checking off.

### 4. Mark complete

Update `tasks.md`: `- [ ]` → `- [x]`.

Show the user:
- task completed
- files touched (concrete paths)
- anomalies detected

### 5. Next task

**If tasks remain**: continue with the next one without asking permission.

**Stop only if**:
- There's a blocker (error, unhandled exception)
- There's an open decision in the spec
- You have a question only the user can answer

**If it was the last one**:
> "All complete. Run `/nova-review`."

## Rules

- Execute all tasks in sequence.
- Stop only on a blocker or open decision.
- If a task is bigger than expected, stop and report.
- Don't commit here (that's `/nova-wrap`).
- Don't update `context/decisions/` or `context/services/` here (that's `/nova-wrap`).
