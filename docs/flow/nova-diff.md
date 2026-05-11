---
description: Compare your local version of a framework file against the latest from the installed nova-spec package.
---

# /nova-diff

Read-only command. Shows you the difference between **your local copy** of a
framework file and the **version shipped by the installed nova-spec package**,
so you can decide whether to merge upstream changes.

```text
/nova-diff <relative-path>
```

Example:

```text
/nova-diff novaspec/templates/pr-body.md
```

## When you'd run it

After `/nova-sync` (or the auto-sync hook) reports:

```text
⚠ 1 file(s) NOT updated (you have local edits):
   novaspec/templates/pr-body.md  → /nova-diff novaspec/templates/pr-body.md
```

That hint at the end of the line is the invitation. Run `/nova-diff` with
that path to see what changed upstream — your file is preserved either way.

## What it does

1. **Resolves the path** — `$ARGUMENTS` must be a path relative to the repo
   root (e.g. `novaspec/templates/pr-body.md` or `AGENTS.md`). If the local
   file doesn't exist, the command says so and stops.

2. **Locates the package version** by calling:
   ```bash
   npx nova-spec source "$ARGUMENTS"
   ```
   This prints the absolute path to the file inside the installed nova-spec
   package (e.g. `~/.npm/_npx/<hash>/node_modules/nova-spec/<path>`). The
   `source` subcommand rejects paths that escape the package (`../foo`),
   so prompt-injection attempts can't be used to leak arbitrary files.

3. **Diffs the two files**:
   ```bash
   diff -u "<package-path>" "<local-path>"
   ```
   Lines marked `-` are from the package version (the upstream).
   Lines marked `+` are from your local copy (your edits).

4. **Asks you to decide**:
   ```text
   Options:
     [K] Keep your version — ignore the upstream change (no-op)
     [M] Merge manually — I'll print both paths so you can edit
     [R] Replace with the package version — discard your local edits
   ```

   Nothing is auto-applied. You must explicitly choose.

## What each choice does

| Choice | Effect |
|---|---|
| **[K] Keep** | Nothing changes. Next `/nova-sync` will still flag the file with the same warning — until you eventually merge or replace. |
| **[M] Merge** | Prints both file paths and reminds you that after merging, the next sync may still flag the file (until your hash matches the new shipped hash). |
| **[R] Replace** | Overwrites your local file with the package version. **Asks for confirmation before destroying your edits.** |

## Errors you may see

| Error | Cause |
|---|---|
| `No local file at "<path>"` | The file doesn't exist in your working tree. Check the path. |
| `✗ Path escapes the nova-spec package` | Tried to use `../` to read outside the package. Blocked by design. |
| `✗ <path> is not part of the nova-spec package` | Path doesn't correspond to anything shipped (e.g. you passed `notes.md`). |

## Why this exists

The whole `/nova-sync` model is built on **preserving your local edits**.
But once you've edited a framework file, you have a question: *"is there an
upstream change I'm missing?"* `/nova-diff` is the answer. Without it, you'd
have to find the installed nova-spec package by hand and diff manually every
time you wanted to check.

It also closes the loop on the security model: rather than letting the agent
read arbitrary files, `npx nova-spec source` is the **only** safe way to
locate package files, and it sandboxes any path-traversal attempt.

## Companion commands

- [`/nova-sync`](nova-sync.md) — the producer of the warnings that this command resolves.
- [Customization → Overview](../customization/overview.md) — explains the edit-in-place model.
- [Architecture → Sync internals](../architecture/sync-internals.md) — the hash-compare decision matrix.
