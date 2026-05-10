---
description: Show what changed in core for a file you've edited locally
argument-hint: <relative-path-from-repo-root>
---

You are a **read-only** command. Show the diff between the user's local
version of a framework file and the latest version from the npm package,
so they can decide whether to merge upstream changes.

## How nova-spec stays out of your way

When you edit a file under `novaspec/` (or `AGENTS.md`), `npx nova-spec sync`
detects the local edit by hash-compare and **does not overwrite it**. Those
files are listed in the sync report under "NOT updated (you have local edits)"
with a hint to run `/nova-diff <path>`.

## Steps

### 1. Resolve the path

`$ARGUMENTS` is the file path the user wants to diff, relative to the repo
root. Examples:
  - `novaspec/templates/pr-body.md`
  - `novaspec/commands/nova-wrap.md`
  - `AGENTS.md`

If the path doesn't exist locally:
```
No local file at "<path>".
```
Stop.

### 2. Find the npm version

The shipped version of the file lives inside the installed `nova-spec`
package. Run:

```bash
npx nova-spec source "$ARGUMENTS"
```

(This subcommand prints the absolute path to the file inside the installed
nova-spec package, e.g. `~/.npm/_npx/<hash>/node_modules/nova-spec/<path>`.)

If the file isn't part of the package, say so and stop.

### 3. Show the diff

```bash
diff -u "<package-source>" "<local-path>"
```

Present it clearly:
- Lines added/removed in YOUR copy (your edits) → keep these unless you want
  to revert.
- Lines added/removed in CORE → consider whether to merge.

### 4. Decision prompt

```
Options:
  [K] Keep your version — ignore upstream changes (no-op)
  [M] Merge manually — I'll show both file paths so you can edit
  [R] Replace with the package version — discard your edits
```

Wait for explicit user selection.

- **[K]**: do nothing.
- **[M]**: print both paths and remind that the next `/nova-sync` will skip
  this file again unless its hash matches the package version.
- **[R]**: copy the package version on top of the local file. Confirm before
  doing it.

## Rules

- Never auto-apply changes.
- Always wait for explicit user decision.
- For [R], ask for confirmation before overwriting.
