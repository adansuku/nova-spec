---
description: Show the current status of a ticket in the SDD flow
argument-hint: [TICKET-ID]
---

You are a **read-only** command. You don't modify any file.
Your only job is to inspect on-disk artifacts and report status.

## Step 1 — Resolve the ticket-id

If the user passed an argument (`$ARGUMENTS` is non-empty), use it as
`<ticket-id>`.

If there's no argument:
1. Read the current git branch (`git branch --show-current`).
2. If the branch matches the pattern `(feature|fix|arch)/<TICKET>-<slug>`,
   extract `<TICKET>` as `<ticket-id>`.
3. If the branch **doesn't** match that pattern:
   - List the directories under `context/changes/active/`.
   - If there are open tickets, show:

     ```
     No active ticket on the current branch.

     Open tickets:
     - <TICKET-ID>: <inferred step>
     ```

   - If there are none, show:

     ```
     No active ticket and no open tickets in context/changes/active/.
     Run /nova-start <TICKET> to begin.
     ```

   - In both cases, **stop here**.

## Step 2 — Locate the artifacts

Look for the ticket's artifacts in this priority order:

1. **Archived**: `context/changes/archive/<ticket-id>/` exists → step = `archived`
2. **Active**: `context/changes/active/<ticket-id>/` directory

If neither exists:

```
Ticket <ticket-id> not found.
Neither context/changes/active/<ticket-id>/ nor context/changes/archive/<ticket-id>/ exists.
```

Stop here.

## Step 3 — Infer the current step

Evaluate in order (first match wins):

| Condition | Step | Next |
|---|---|---|
| Directory in `archive/` | `archived` | — |
| `review.md` exists | `wrap` | `/nova-wrap` |
| `tasks.md` with no `- [ ]` pending | `review` | `/nova-review` |
| `tasks.md` with any `- [ ]` | `do` | `/nova-build` |
| `proposal.md` exists and `tasks.md` doesn't | `spec` | `/nova-plan` |
| No `proposal.md` | `start` | `/nova-spec` |

## Step 4 — Read the title

If `proposal.md` exists, extract the title from the first line `# <TICKET>: <title>`.
If it doesn't exist or can't be read, use `(no title)`.

## Step 5 — Compute task progress

Only if step is `do` or `review`:
- Count lines with `- [x]` → completed tasks
- Count lines with `- [ ]` → pending tasks
- Total = completed + pending

## Step 6 — Show the report

Use the structure of `novaspec/templates/status-report.md` as a reference.
Include `Progress` only if step is `do`; use `Archived` instead of
`Next` if step is `archived`. The `Next` field comes from the same-named
column in Step 3.

## Rules

- **Do not modify any file** under any circumstance.
- If an artifact exists but can't be parsed, report
  `(could not read <file>)` and continue with what you have.
- Don't make assumptions about state: infer only from the files.
- If there's ambiguity, choose the more conservative step (the previous one in the flow).
