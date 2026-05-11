---
description: Switch between Jira and free-form ticket identifiers in /nova-start.
---

# Ticket system

`/nova-start` can either fetch tickets from Jira automatically or let you paste content manually. The switch is one config key:

```yaml
# novaspec/config.yml
ticket_system: jira    # jira | none
```

## `ticket_system: jira`

The default if you enabled Jira during `npx nova-spec init`.

* `/nova-start PROJ-42` validates the key matches `[A-Z][A-Z0-9]+-[0-9]+`. Wrong format → refuses with a clear message.
* Invokes the [`jira-integration` skill](../integrations/jira.md), which calls `npx nova-spec jira get PROJ-42`.
* Reads `JIRA_API_TOKEN` from your shell env (referenced as `${JIRA_API_TOKEN}` in `config.yml`).
* On 401 / 404 / network errors, falls back to manual paste with explicit instructions.
* Branch name uses `{type}/PROJ-42-{slug}` per `branch.pattern`.

The full Jira config block:

```yaml
ticket_system: jira

jira:
  skill: jira-integration
  url: https://your-workspace.atlassian.net
  project: PROJ
  email: you@example.com
  token: ${JIRA_API_TOKEN}
  done_transition_id: "41"
  transitions:
    done: "41"
```

See [Integrations → Jira](../integrations/jira.md) for setup, transition discovery, and troubleshooting.

## `ticket_system: none`

For teams that don't use a tracker, or use one without an API integration (Linear, GitHub Issues, ClickUp, internal tooling).

```yaml
ticket_system: none
```

What changes:

* `/nova-start <ANYTHING>` accepts any identifier — `auth-rewrite`, `BUG-1234`, `2026-q1-migration`, anything.
* No format validation, no API call.
* The command immediately asks you to paste:
  * title
  * description
  * acceptance criteria
  * relevant comments

* Branch name uses your identifier as-is. If `branch.pattern` is `{type}/{ticket}-{slug}` and you pass `auth-rewrite`, you get `feature/auth-rewrite-add-mfa` (slug from the title).

* `/nova-wrap` skips the Jira "transition to Done" step.

You can leave the `jira:` block in `config.yml` even with `ticket_system: none` — it'll just be ignored.

## Hybrid use

If your team uses Jira mostly but occasionally has tickets in a different system, switch the config temporarily for those:

```bash
# Edit config.yml: ticket_system: none
/nova-start LINEAR-456
# When done, switch back: ticket_system: jira
```

Or run two project installs of nova-spec in separate clones — but in practice the switch is usually rare enough that one global setting works.

## What changes inside `/nova-start.md`

The command bifurcates on `ticket_system`:

```text
Read novaspec/config.yml → ticket_system

if ticket_system: jira
    Validate $ARGUMENTS matches [A-Z][A-Z0-9]+-[0-9]+
    Invoke jira-integration skill
    Handle 401 / 404 / timeout fallbacks

if ticket_system: none (or missing)
    Skip format validation
    Ask for paste
```

You can edit `novaspec/commands/nova-start.md` to add a third path (e.g. `linear`) if you want — see the file for the existing structure.

## Migration between values

* **Going from `jira` to `none`** — just change the key. Existing branches still work; new ones won't validate or close in Jira.
* **Going from `none` to `jira`** — set the key, fill in the `jira:` block, set `JIRA_API_TOKEN` in your env, run `npx nova-spec sync` to pick up any default-config migrations.

## What NOT to break

* If you set `ticket_system: jira`, also set `jira.skill: jira-integration` — they're paired.
* `JIRA_API_TOKEN` must be in the env where you run Claude Code, not just in a `.env` file (unless you load it via your shell rc).
