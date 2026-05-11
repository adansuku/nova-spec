---
description: Show what changed upstream for a framework file you've edited locally
argument-hint: <relative-path-from-repo-root>
---

You are a **read-only** command. You compare the user's local version of a
framework file against the version shipped by the installed nova-spec
package, so they can decide whether to merge upstream changes.

## When this is invoked

`npx nova-spec sync` reports files with local edits under the heading
`⚠ N file(s) NOT updated (you have local edits)` and points the user at
this command via:

```
→ /nova-diff <path>
```

For example: `/nova-diff novaspec/templates/pr-body.md`.

## Steps

### 1. Resolve the path

`$ARGUMENTS` is a path relative to the repo root, e.g.
`novaspec/templates/pr-body.md` or `AGENTS.md`.

Verify the local file exists. If not:
```
No local file at "<path>". Nothing to diff.
```
Stop.

### 2. Locate the upstream (package) version

Run:

```bash
npx nova-spec source "$ARGUMENTS"
```

This prints the absolute path to the file **inside the installed nova-spec
package** (somewhere like `~/.npm/_npx/<hash>/node_modules/nova-spec/<path>`).
Exit code 1 + `✗ ... is not part of the nova-spec package.` means the path
is not a framework file — tell the user it isn't tracked by nova-spec.

### 3. Show the diff

```bash
diff -u "<package-path>" "<local-path>"
```

Read both files and present the diff clearly:
- Lines marked `+` in YOUR copy are your edits (keep these unless you want to revert).
- Lines marked `+` in the package copy are upstream changes (consider merging).

### 4. Decision prompt

Ask the user:

```
Options:
  [K] Keep your version — ignore the upstream change (no-op)
  [M] Merge manually — I'll print both paths so you can edit
  [R] Replace with the package version — discard your local edits
```

Wait for an explicit selection.

- **[K]**: do nothing. Next `/nova-sync` will skip the file again with the same warning.
- **[M]**: print both file paths and remind the user that after they merge, sync may still flag the file as edited (until its hash again matches the shipped version).
- **[R]**: copy the package version over the local file. **Ask for confirmation before overwriting.** After replacement, the next sync will treat it as up to date.

## Rules

- Never auto-apply. Always wait for explicit selection.
- For `[R]`, double-confirm before overwriting — destructive.
- If the user passes a path that includes `..`, the `source` CLI will
  refuse it. Trust that boundary check; don't try to bypass it.
