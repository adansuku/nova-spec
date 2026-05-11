---
description: Apply package updates while preserving your local edits via hash-compare.
---

# /nova-sync

Pulls the latest nova-spec from npm and applies it to the project, **without
overwriting files you've edited locally**.

```text
/nova-sync
```

You rarely run this by hand. The `SessionStart` hook installed by `npx
nova-spec init` already runs `npx nova-spec@latest sync` every time Claude
Code or OpenCode starts, so most updates land before you notice. Use the
slash command when you want to force an immediate sync without restarting
the IDE.

## What it does

The command shells out to:

```bash
npx nova-spec@latest sync
```

Which performs, in order:

1. Reads `novaspec/.nova-manifest.json` — the record of what was last shipped.
2. Hashes every framework file in the installed package (SHA-256).
3. For each file, compares against the local hash and the previously-shipped hash:
   - File doesn't exist locally → **create**
   - Local hash matches new shipped → **no-op** (already up to date)
   - Local hash matches previously-shipped → **overwrite** (you didn't touch it)
   - Anything else → **skip** (you have local edits — preserved)
4. Detects files removed upstream:
   - Local hash matches previously-shipped → **remove**
   - Local hash differs → **keep** with warning
5. Runs idempotent migrations on `novaspec/config.yml` (e.g. adding new sections).
6. Refreshes the `SessionStart` hook command (so any change to it propagates).
7. Refreshes runtime symlinks under `.claude/` and `.opencode/` (recreates them
   if a previous Windows install fell back to copying).

See [Architecture → Sync internals](../architecture/sync-internals.md) for the algorithm.

## Sample output

```text
  ✓ nova-spec synced to v1.0.7

  + 2 new file(s):
     novaspec/templates/release-notes.md
     novaspec/skills/changelog/SKILL.md

  ↻ 3 file(s) updated (untouched locally):
     novaspec/commands/nova-build.md
     novaspec/agents/context-loader.md
     AGENTS.md

  ⚠ 1 file(s) NOT updated (you have local edits):
     novaspec/templates/pr-body.md  → /nova-diff novaspec/templates/pr-body.md

  − 1 file(s) removed upstream:
     novaspec/templates/legacy-thing.md
```

Categories:

| Symbol | Meaning |
|---|---|
| `+` | New in this version — created from package |
| `↻` | Updated — you hadn't touched it, safe to overwrite |
| `⚠ NOT updated` | You edited this. Use `/nova-diff <path>` to see upstream changes and decide |
| `−` | Removed upstream and you hadn't touched it — deleted |
| `⚠ removed upstream but kept` | Removed upstream but you edited it — preserved |

## When `⚠ NOT updated` appears

Each skipped file is listed with a hint:

```text
→ /nova-diff novaspec/templates/pr-body.md
```

Run that to see what changed upstream and pick one of: keep your version,
merge manually, or replace with the package version. See [`/nova-diff`](nova-diff.md).

## Errors you may see

| Error | Cause | Fix |
|---|---|---|
| `nova-spec not installed in this directory` | No `novaspec/` in cwd | Run `npx nova-spec init` first |
| `Manifest was corrupt; backed up to ...` | `.nova-manifest.json` was mangled | Sync continues conservatively (preserves edits). Next sync will rebuild the manifest. |
| `Could not parse .claude/settings.local.json` | Malformed JSON | Fix manually; sync skips the hook update for that file |

Sync **never** exits with an error from local edits — those are reported,
not errors.

## When to use it manually

* You just published a new version and want to test it without restarting.
* You want to see the report explicitly (the hook silences it to `~/.nova-spec.log`).
* You suspect the SessionStart hook hasn't run (e.g. air-gapped or
  registry timeout) — run sync manually to confirm.

## What it never does

* Does not overwrite `novaspec/config.yml` — your Jira/forge/branch config is yours.
* Does not touch `.env`, `notes.md`, `context/` — those belong to your project.
* Does not commit anything — sync only writes to disk; staging and commit
  are your decisions.
* Does not call any external service beyond the npm registry (no telemetry).
