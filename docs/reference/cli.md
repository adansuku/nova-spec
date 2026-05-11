---
description: Every npx nova-spec subcommand, what it does, and when to call it.
---

# CLI reference

The `nova-spec` CLI lives at `bin/nova-spec.js` (registered in `package.json` → `bin`). Every subcommand is implemented in `lib/`.

```text
npx nova-spec <subcommand> [args...]
```

## `init`

Interactive installer. Run once per project (or once globally).

```bash
npx nova-spec init
# or simply:
npx nova-spec
```

Prompts:

1. **Scope** — `project` (current dir) / `global` (`~/.claude`) / `update`
2. **Runtime** — `claude` / `opencode` / `both`
3. **Ticket system** — `jira` / `none`
4. **Jira config** (only if `jira`) — URL, project, email, token validation, transition discovery
5. **Base branch** — default `main`
6. **Forge** — auto-detected from `git remote`; you confirm or override

Side effects:

* Copies framework files from the installed package into `novaspec/`
* Generates `novaspec/config.yml`
* Creates `.claude/` and/or `.opencode/` symlinks
* Installs `SessionStart` hook in `.claude/settings.local.json`
* Creates `context/` scaffolding (project install only): `stack.md`, `conventions.md`, plus `decisions/`, `gotchas/`, `services/`, `changes/active/`, `changes/archive/`
* Generates initial `.nova-manifest.json`
* Adds entries to `.gitignore`

`init` is **idempotent** for the safe parts: re-running it preserves your `config.yml`, your `CLAUDE.md`, your stack/conventions files, and any framework files you've edited (via the same hash-compare logic as sync).

`update` scope is a shortcut for `npx nova-spec sync`.

## `sync`

Apply package updates to an existing install.

```bash
npx nova-spec sync
```

Runs automatically on every Claude Code / OpenCode session start via the `SessionStart` hook. You can also call it manually.

Steps:

1. Reads `novaspec/.nova-manifest.json` (last-shipped hashes)
2. Walks every framework file in the installed package
3. For each file, hash-compares against the consumer's local copy
4. **Untouched locally** → overwrites with the new version
5. **Modified locally** → skips, reports
6. **New in this version** → creates
7. **Removed upstream and untouched locally** → deletes
8. **Removed upstream but modified locally** → keeps with warning
9. Migrates `config.yml` (idempotent)
10. Refreshes the `SessionStart` hook command (in case it changed)
11. Regenerates the manifest

Output is sectioned: `+ new`, `↻ updated`, `⚠ NOT updated`, `− removed`, `⚠ removed upstream but kept`.

See [Architecture → Sync internals](../architecture/sync-internals.md).

## `jira <subcmd> [args...]`

Deterministic Jira client. Reads `novaspec/config.yml` for URL/email and resolves `${JIRA_API_TOKEN}` from env.

```bash
npx nova-spec jira get PROJ-42
npx nova-spec jira transitions PROJ-42
npx nova-spec jira transition PROJ-42 41
```

Output is JSON. Exit codes:

| Code | Meaning |
|---|---|
| 0 | Success |
| 1 | Generic error |
| 2 | Usage error |
| 401 | Invalid credentials |
| 404 | Ticket not found |

The token never appears in the command line — Node passes it as an HTTP `Authorization: Basic ...` header internally.

See [Integrations → Jira](../integrations/jira.md).

## `forge <subcmd> [args...]`

Multi-forge abstraction. Reads `novaspec/config.yml` → `forge:` and falls back to git-remote detection.

```bash
# What does the repo's remote suggest?
npx nova-spec forge detect
# → github | gitlab | bitbucket | (exit 1 if none)

# Build the create-PR command
npx nova-spec forge pr-command "Title" "Body" "main"
# → gh pr create --base 'main' --title 'Title' --body 'Body'
# or
# → glab mr create --target-branch 'main' --title 'Title' --description 'Body' --fill

# What's the right vocabulary for user-facing messages?
npx nova-spec forge term
# → PR (github) or MR (gitlab)
```

`/nova-wrap` invokes `pr-command` and `term`. You can use them in your own scripts too.

See [Integrations → Forge](../integrations/forge.md).

## `source <relative-path>`

Print the absolute path to a framework file inside the installed nova-spec package.

```bash
npx nova-spec source novaspec/templates/pr-body.md
# → /Users/adan/.npm/_npx/<hash>/node_modules/nova-spec/novaspec/templates/pr-body.md
```

Used by `/nova-diff` to locate the package version of a file the user has edited locally.

Exits 1 if the path isn't part of the package.

## Exit code summary

| Code | Where | Meaning |
|---|---|---|
| 0 | Any | Success |
| 1 | Generic | Operation failed |
| 2 | Any | Usage error (bad args, missing config) |
| 401 | `jira` | Invalid Jira credentials |
| 404 | `jira` | Ticket not found |

## Implementation map

| Subcommand | File |
|---|---|
| `init` | `lib/installer.js` |
| `sync` | `lib/sync.js` |
| `jira` | `lib/cli.js` → `runJira` → `lib/jira.js` |
| `forge` | `lib/cli.js` → `runForge` → `lib/forge.js` |
| `source` | `lib/cli.js` → `runSource` |
| Migrations | `lib/migrate-config.js` (called from `sync`) |

Edit any of these in your project to change CLI behavior — but remember sync hash-compares them too: your edits survive updates.
