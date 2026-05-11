---
description: Every key in novaspec/config.yml with its default and effect.
---

# config.yml reference

`novaspec/config.yml` is your project config. The installer generates it; everything else respects it. **It is gitignored** — each developer's instance gets their own (though you can choose to commit it if your team shares it).

## Full example

```yaml
branch:
  pattern: "{type}/{ticket}-{slug}"
  types:
    bugfix: bugfix
    hotfix: hotfix
    feature: feature
    documentation: docs
    refactor: refactor
    chore: chore
    architecture: arch
  ticket_case: upper
  base: main

forge:
  type: auto
  cli: auto

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

## `branch:`

Controls how `/nova-start` names the new branch.

| Key | Default | Effect |
|---|---|---|
| `branch.pattern` | `{type}/{ticket}-{slug}` | Branch-name template. Tokens: `{type}`, `{ticket}`, `{slug}`. |
| `branch.types` | (7 entries: `bugfix`, `hotfix`, `feature`, `documentation` → `docs`, `refactor`, `chore`, `architecture` → `arch`) | Map of classification → branch prefix. The **values** are the actual prefixes used; keys are display names. |
| `branch.ticket_case` | `upper` | `upper` (`PROJ-42`) or `lower` (`proj-42`) for the `{ticket}` token. |
| `branch.base` | `main` | Branch new ticket branches are cut from. |

`branch.types` example: `documentation: docs` means tickets classified as "documentation" get a branch starting with `docs/`. Add or rename freely. Whatever values appear here are also accepted by guardrail #1 (`branch-pattern`).

## `forge:`

Controls PR/MR creation in `/nova-wrap`.

| Key | Default | Effect |
|---|---|---|
| `forge.type` | `auto` | `auto` re-detects from `git remote`. `github`, `gitlab`, `none` force a value. |
| `forge.cli` | `auto` | `auto` picks `gh` or `glab` based on type. Override only if your team installed the CLI under a non-standard name. |

`forge.type: none` disables PR/MR creation. `/nova-wrap` will commit and tell you to push manually.

See [Integrations → Forge](../integrations/forge.md).

## `ticket_system`

Switch between Jira fetch and free-form paste in `/nova-start`.

| Value | Behavior |
|---|---|
| `jira` | `/nova-start <KEY>` validates regex `[A-Z][A-Z0-9]+-[0-9]+`, calls `npx nova-spec jira get`. `/nova-wrap` transitions to Done. |
| `none` | No format check, no API call. `/nova-start` asks you to paste content. `/nova-wrap` skips Jira close. |

If the key is missing, behavior defaults to `jira` for backward compat with installs from before this key existed.

See [Customization → Ticket system](../customization/ticket-system.md).

## `jira:`

Required when `ticket_system: jira`. Ignored otherwise.

| Key | Default | Effect |
|---|---|---|
| `jira.skill` | `jira-integration` | Which skill to invoke. Set to `""` to disable Jira even if `ticket_system: jira`. |
| `jira.url` | — | Your Jira base URL, no trailing slash. |
| `jira.project` | — | Default project key. Used for the `<TICKET>` regex anchor and listing endpoints. |
| `jira.email` | — | The email tied to your API token. |
| `jira.token` | `${JIRA_API_TOKEN}` | Reference to env var. The CLI resolves `${VAR}` at call time. Never inline the actual token. |
| `jira.done_transition_id` | `"41"` | Legacy flat key — still respected for backward compat. |
| `jira.transitions.done` | same as legacy | Structured form. `/nova-wrap` reads this first, falls back to `jira.done_transition_id`. |

Discover the right `transitions.done` ID with:

```bash
npx nova-spec jira transitions <some-existing-ticket-key>
```

See [Integrations → Jira](../integrations/jira.md).

## How keys are read

Every command that needs config reads `novaspec/config.yml` directly (not from a cache). Edit and the next command sees the change. No restart required.

The CLI side (`nova-spec jira`, `nova-spec forge`) uses a tiny YAML reader in `lib/cli.js` that handles flat scalars and the `parent: \n  key: value` form. **Don't put complex YAML structures** (multi-line strings, anchors, inline JSON) — keep it scalar.

## Migrations

When config-yml schema evolves between nova-spec versions, `lib/migrate-config.js` runs idempotent migrations during `sync`. Current ones:

| Migration | Detects | Applies |
|---|---|---|
| `add-forge-section` | `forge:` missing | Appends a `forge:` block with `type: auto`, `cli: auto` |
| `rename-done-transition-id` | `done_transition_id:` present, `transitions:` missing | Adds `transitions.done` mirror, keeps the legacy key |

You don't have to do anything — they run automatically. See [Architecture → Sync internals](../architecture/sync-internals.md).

## What NOT to put in this file

* **Secrets**. Use env vars and reference them with `${VAR}` syntax.
* **Multi-line YAML** (block scalars, anchors, complex nesting). The reader is intentionally minimal.
* **Per-developer overrides if you commit the file**. If you commit `config.yml`, treat it as team-shared. Personal overrides go in env vars.

## Where it lives

* Path: `novaspec/config.yml`
* Gitignored: yes (by default — change in `.gitignore` if your team shares one config)
* Created by: `npx nova-spec init`
* Read by: every command + skill that needs project settings + the CLI subcommands `jira` and `forge`
