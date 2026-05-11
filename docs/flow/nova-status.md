---
description: Read-only inspection of where a ticket is in the flow.
---

# /nova-status

Tells you where a ticket sits in the flow without modifying anything.

```text
/nova-status
/nova-status PROJ-42
```

## How it resolves the ticket

1. If `$ARGUMENTS` is non-empty, uses it as the ticket id.
2. Otherwise reads `git branch --show-current` and extracts the ticket from the branch name. Branch must match `<type>/<TICKET>-<slug>` where `<type>` is one of the values from `branch.types` in `config.yml`.
3. If the branch doesn't match and there's no argument, it lists open tickets under `context/changes/active/`.

If `ticket_system: none`, the `<TICKET>` part is treated as a free-form identifier — no regex enforcement.

## What it reports

The command infers the current step by checking artifacts in priority order:

| Condition | Step | Suggested next |
|---|---|---|
| Directory in `context/changes/archive/` | `archived` | — |
| `review.md` exists | `wrap` | `/nova-wrap` |
| `tasks.md` with no `- [ ]` pending | `review` | `/nova-review` |
| `tasks.md` with any `- [ ]` | `do` | `/nova-build` |
| `proposal.md` exists, `tasks.md` doesn't | `spec` | `/nova-plan` |
| No `proposal.md` | `start` | `/nova-spec` |

Output uses `novaspec/templates/status-report.md`. Example:

```text
## Status of ticket PROJ-42

Title    : Add rate limiting to /api/login
Branch   : feature/PROJ-42-rate-limit-login
Step     : do
Progress : 4 / 7 tasks
Next     : /nova-build
```

`Progress` only appears for `do` step. `Archived` replaces `Next` for `archived` step.

## Rules

* **Never modifies any file.** Pure inspection.
* If a file can't be parsed, reports `(could not read <file>)` and continues.
* Doesn't make assumptions about state — only what files on disk say.
* Picks the more conservative step when ambiguous.

## When to use it

* Coming back to a half-done ticket after a break.
* Onboarding a teammate who needs to know where you left things.
* Before running a command — confirms the current state matches your expectation.

## Errors you may see

| Error | Why |
|---|---|
| `No active ticket on the current branch` | Your branch doesn't match the pattern; pass a ticket id explicitly or run `/nova-start` |
| `Ticket <id> not found` | Neither `active/` nor `archive/` has a directory for it |
| `(could not read tasks.md)` | File present but malformed; the report continues without progress info |

## Customizing it

* The report format → edit `novaspec/templates/status-report.md`.
* Step inference rules → edit step 3 of `novaspec/commands/nova-status.md`.
