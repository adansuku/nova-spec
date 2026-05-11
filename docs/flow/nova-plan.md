---
description: Translates the closed spec into an executable task list.
---

# /nova-plan

Converts `proposal.md` into a concrete, checkbox-driven `tasks.md` your agent can execute.

```text
/nova-plan
```

`quick-fix` tickets skip this step.

## What it does

1. Runs `bash novaspec/guardrails/proposal-closed.sh <ticket-id>` — exits non-zero if `proposal.md` contains `TBD`, `TODO`, `FIXME`, `???`, `<placeholder>`, or `[ ] decision`. **Blocks** if the spec isn't closed.
2. Reads `proposal.md` to identify affected services, closed decisions, and success criteria.
3. Writes `context/changes/active/<TICKET>/tasks.md` using `novaspec/templates/tasks.md` as the structure.
4. **Stops at a human checkpoint** before you run `/nova-build`.

## Guardrails

| # | Check |
|---|---|
| 1 | Branch matches `branch.pattern` |
| 2 | `proposal.md` exists |
| 7 | `proposal-closed.sh` passes |

## How tasks are structured

Rules the planner follows:

* Each task executable in **15–60 minutes**.
* Tasks in **executable order** — no forward references.
* **Characterization tests before** modifying existing code.
* Use `- [ ]` checkboxes (so `/nova-status` can count progress).
* **No memory updates** as tasks (`context/services/`, `context/decisions/`, `context/gotchas/` are owned by `/nova-wrap`). Top-level docs like `README.md` or `CONTRIBUTING.md` are fair game.
* The plan derives from the spec — no inventing scope.

A typical `tasks.md` has a `## Files to touch` section listing every file the change will modify. The [`review-checks` guardrail](../reference/guardrails.md) verifies later that every declared file actually shows up in the diff.

## What it produces

| Artifact | Where |
|---|---|
| `tasks.md` | `context/changes/active/<TICKET>/tasks.md` |

## Next step

```text
/nova-build
```

## Errors you may see

| Error | Why | Fix |
|---|---|---|
| `✗ Proposal has open markers` | `proposal-closed.sh` found `TBD` / `TODO` / etc. | Re-run `/nova-spec` and close them |
| `proposal.md does not exist` | You skipped `/nova-spec` | Run it first |
| Plan invents scope not in the spec | The agent over-reached | Re-prompt with "the spec doesn't say X — drop it or update the spec first" |

## Customizing it

* The shape of `tasks.md` → edit `novaspec/templates/tasks.md`.
* Custom task categories (e.g. `[infra]`, `[migration]`) → add them to the template and to `novaspec/commands/nova-plan.md` step 2 rules.
* Stricter proposal closure → add greps to `novaspec/guardrails/proposal-closed.sh`.
