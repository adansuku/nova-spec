---
description: Show differences between your custom override and the current core version
argument-hint: <skill|command|agent name>
---

You are a **read-only** command. Show what changed between the user's custom
override and the upstream core version for `$ARGUMENTS`.

## Steps

### 1. Resolve paths

- Custom path: `novaspec/custom/<type>/$ARGUMENTS/` (check `skills/`, `commands/`, `agents/` in order)
- Core path: `novaspec/<type>/$ARGUMENTS/`

If the custom path doesn't exist:
```
No custom override found for "$ARGUMENTS".
Nothing to diff.
```
Stop here.

### 2. Check manifest

Read `novaspec/.nova-manifest.json`. Look for `$ARGUMENTS` in `outdated_customs`.

If not in `outdated_customs`:
```
Your custom "$ARGUMENTS" matches the current core version.
No upstream changes since your override was created.
```
Stop here.

### 3. Show diff

Run:
```bash
diff -u novaspec/<type>/$ARGUMENTS/SKILL.md novaspec/custom/<type>/$ARGUMENTS/SKILL.md
```

Present the diff clearly, highlighting:
- Lines added in your custom version (your changes)
- Lines changed in the new core version that your custom doesn't have

### 4. Decision prompt

```
Options:
  [K] Keep your version — ignore upstream changes
  [M] Merge manually — I'll open both files for you to edit
  [R] Replace with core — discard your custom, use new core version
```

Wait for user selection.

- **[K]**: Update manifest to mark as reviewed. No file changes.
- **[M]**: Show both file paths and remind user to run `/nova-sync` after merging.
- **[R]**: Delete `novaspec/custom/<type>/$ARGUMENTS/` and confirm.

## Rules

- Never auto-apply changes.
- Always wait for explicit user decision.
- For [R], ask for confirmation before deleting.
