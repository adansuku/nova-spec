---
description: Sync nova-spec core to the latest version and report custom skill status
---

You are a **maintenance command**. Your job is to update nova-spec and report
which custom overrides may need attention.

## Steps

### 1. Run the sync

Execute in the terminal:

```bash
npx nova-spec sync
```

Show the output to the user as-is.

### 2. Parse the results

After sync completes, read `novaspec/.nova-manifest.json` and check for any
skills, commands, or agents listed under `outdated_customs` (if the key exists).

### 3. Report

If there are outdated custom overrides:

```
⚠️  Custom overrides with upstream changes:
  - <name> → run /nova-diff <name> to review what changed

✅  Everything else is up to date.
```

If everything is clean:

```
✅  nova-spec is up to date. No custom overrides affected.
```

## Rules

- Don't modify any custom files.
- Don't auto-merge or apply changes.
- If `npx nova-spec sync` fails, show the error and stop.
