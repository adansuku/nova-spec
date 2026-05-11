---
description: Executes the tasks one by one, with incremental review between each.
---

# /nova-build

Where code actually gets written. Walks `tasks.md` top to bottom, ticking off each task as it completes.

```text
/nova-build
```

## What it does

1. Reads `context/changes/active/<TICKET>/tasks.md`.
2. For each unchecked task:
   - Implements it.
   - Self-checks (does it match the spec? is the diff focused? are there leftover prints/imports?).
   - Marks the task `- [x]`.
   - **Auto-advances** to the next task without asking permission.
3. Stops when:
   - All tasks are checked → tells you to run `/nova-review`.
   - A task fails (test red, unexpected error) → marks it `- [!]` with a note and stops, asking you to investigate.

For `quick-fix` tickets there's no `tasks.md` — the agent implements the fix directly with the same self-check discipline.

## Guardrails

| # | Check |
|---|---|
| 1 | Branch matches `branch.pattern` |
| 2 | `proposal.md` exists (skipped for `quick-fix`) |
| 3 | `tasks.md` exists (skipped for `quick-fix`) |

## The self-check between tasks

Before marking a task done, the agent runs through:

* Does the change implement what the task said?
* Is the diff focused on this task only (no scope creep)?
* Are there dead lines, prints, or stray imports?
* If tests exist for the touched area, do they still pass?

If any of these is "no", the agent fixes before checking off. This is the **incremental** part — you don't get a 7-task PR with all the same problems amplified.

## What it produces

| Artifact | Where |
|---|---|
| Code changes | Across the repo, scoped to `tasks.md → Files to touch` |
| Updated `tasks.md` | Checkboxes flipped to `[x]` (or `[!]` on failure) |

## Next step

```text
/nova-review
```

## Errors you may see

| Error | Why | Fix |
|---|---|---|
| Task marked `- [!]` | Test failed or unexpected error mid-task | Investigate the message, fix manually, then re-run `/nova-build` |
| Agent does too much in one task | Task was too coarse in `tasks.md` | Edit `tasks.md` to split it; re-run |
| Agent does too little | Task was too vague | Edit `tasks.md` to specify; re-run |

## Customizing it

* Self-check criteria → edit step 3 of `novaspec/commands/nova-build.md`.
* Auto-advance behavior (e.g. ask for confirmation every N tasks) → add a soft cap in the same file.
* Task categories or special markers → add support both to `nova-build.md` and `tasks.md` template.

## A note on tokens

`/nova-build` consumes more tokens than any other command because it loops through tasks. If you have a 30-task plan, expect proportional cost. Consider splitting very large changes across multiple tickets so each plan stays under ~10 tasks.
