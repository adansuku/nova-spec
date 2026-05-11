---
description: Customize the commit message format /nova-wrap produces.
---

# Commit format

The commit message format for `/nova-wrap` lives in:

```text
novaspec/templates/commit.md
```

## What ships by default

```text
<type>(<scope>): <summary>

<optional body>

Refs: <TICKET-ID>
Decisions: <context/decisions/<file>.md if applicable>
```

This is conventional commits with two trailers (`Refs:` and `Decisions:`). The agent picks the type (`feat`, `fix`, `refactor`, `docs`, `chore`, etc.) from the ticket classification and the diff.

## Common changes

### Drop the trailers if you don't use them

```text
<type>(<scope>): <summary>

<optional body>
```

### Use a different ticket-trailer key

```text
<type>(<scope>): <summary>

<optional body>

Issue: <TICKET-ID>
```

Some teams use `Issue:`, some `JIRA:`, some `Closes:`. Whatever your workflow expects.

### Put the ticket key in the subject

If your CI or tracker requires the ticket in the subject line:

```text
[<TICKET-ID>] <type>(<scope>): <summary>

<optional body>
```

### Add Co-Authored-By for pair work

```text
<type>(<scope>): <summary>

<optional body>

Refs: <TICKET-ID>
Co-Authored-By: <name> <<email>>
```

The agent will leave `<name>` and `<email>` for you to fill if you want — or you can hardcode the team's bot/pair pattern.

### Force breaking-change footer

```text
<type>(<scope>): <summary>

<optional body>

BREAKING CHANGE: <description>
Refs: <TICKET-ID>
```

The agent only fills `BREAKING CHANGE:` if the change actually is breaking — based on the spec or the diff.

## Multiple commits

If `/nova-wrap` thinks the change is too large for one commit, it proposes a split. Each commit follows the template independently. You can guide the split by:

* Writing `tasks.md` with sections that map to logical commits
* Adding to `novaspec/commands/nova-wrap.md` step 5 a rule like *"if any task touched both `db/` and `app/`, propose at least two commits"*

## What `/nova-wrap` substitutes

| Placeholder | What gets substituted |
|---|---|
| `<type>` | `feat`, `fix`, `refactor`, `docs`, `chore`, `test`, ... |
| `<scope>` | The most affected service/module (or omitted if global) |
| `<summary>` | One-line imperative subject (≤72 chars typically) |
| `<optional body>` | Why, not what — the diff already shows what |
| `<TICKET-ID>` | The current ticket key |
| `<context/decisions/<file>.md if applicable>` | Names of decisions created during `/nova-wrap` |

## Commit hooks

If your repo has commit hooks (commit-msg, pre-commit), `/nova-wrap` runs through them like any other commit. If a hook rejects the message, the agent reports the error so you can fix the template.

## What NOT to break

* **Keep at least the subject line** — git refuses an empty commit message.
* **Stay under git's 50/72 convention** in the subject if your tooling enforces it.
* **Don't put YAML front-matter** — it'll end up in the actual commit message.
