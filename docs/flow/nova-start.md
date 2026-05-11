---
description: Pulls the ticket, classifies it, creates the branch, and loads architectural context.
---

# /nova-start

The entry point. Turns a ticket key into a working branch with the right context already loaded.

```text
/nova-start PROJ-42
```

## What it does, in order

1. **Fetches the ticket**. Path depends on `ticket_system` in `config.yml`:
   - `jira` → invokes the [`jira-integration` skill](../integrations/jira.md), which calls `npx nova-spec jira get PROJ-42`. Validates the key matches `[A-Z][A-Z0-9]+-[0-9]+` first.
   - `none` → asks you to paste title, description, acceptance criteria, comments. No format check on the identifier.
2. **Classifies the work** into `quick-fix` (<2h, no spec needed), `feature` (2h–3d, full flow), or `architecture` (>3d, requires documented decision in `/nova-wrap`). Picks the more conservative option when torn.
3. **Identifies affected services** from the ticket text, matched against `context/services/<name>.md`. Asks you if unclear.
4. **Creates the git branch** following `branch.pattern` (default `{type}/{ticket}-{slug}`), cut from `branch.base` (default `main`). Verifies the working tree is clean and pulls the base branch first.
5. **Loads context** by invoking the [`context-loader` agent](overview.md) in its own context window. The agent reads `context/stack.md`, `context/conventions.md`, the relevant service files, and 3–5 decisions/gotchas whose names match the ticket scope.
6. **Prints the summary** using `novaspec/templates/ticket-summary.md` and points you at the next step.

## Guardrails

| # | Check | Effect |
|---|---|---|
| 0 | `nova-installed` — `config.yml` and `context/` exist | Refuses to run if nova-spec isn't installed |
| Working tree | Clean (no uncommitted changes) | Stops with a message; commit or stash first |
| Base branch | Exists locally | If missing, asks you which branch to use and recommends setting `branch.base` |

## What it produces

| Artifact | Where |
|---|---|
| Git branch | `<type>/<TICKET>-<slug>` |
| Context summary | Printed to chat (not persisted) |
| `context/changes/active/<TICKET>/` | Created (empty until `/nova-spec`) |

## Next step

| Classification | Next |
|---|---|
| `quick-fix` | `/nova-build` (skips spec + plan) |
| `feature` | `/nova-spec` |
| `architecture` | `/nova-spec` (note: requires documented decision in `/nova-wrap`) |

## Errors you may see

| Error | What it means | Fix |
|---|---|---|
| `Jira returned 401 Unauthorized` | `JIRA_API_TOKEN` invalid or expired | Regenerate at [id.atlassian.com](https://id.atlassian.com/manage-profile/security/api-tokens), update env var |
| `Jira returned 404 for PROJ-42` | Ticket doesn't exist or wrong project prefix | Verify the key and `jira.project` in `config.yml` |
| `Couldn't reach Jira` | Network / VPN issue | Falls back to manual paste — no need to retry |
| `Working tree is dirty` | Uncommitted changes | Commit or stash, then re-run |
| Branch pattern doesn't match `branch.types` | Branch type not in config | Add it to `branch.types` in `config.yml` |

## Customizing it

* The ticket-summary format → edit `novaspec/templates/ticket-summary.md`.
* The classification heuristic → edit step 2 of `novaspec/commands/nova-start.md`.
* What context is loaded → edit `novaspec/agents/context-loader.md` (e.g. add another file under "Always read").
* Skip the Jira format check → set `ticket_system: none` in `config.yml`.
