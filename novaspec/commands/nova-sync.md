---
description: Sync nova-spec to the latest version and report which local edits were preserved
---

You are a **maintenance command**. Your job is to update nova-spec and
report which framework files were not updated because the user has local
edits.

## Background

`npx nova-spec sync` walks every framework file (commands, skills, agents,
templates, guardrails, AGENTS.md, CLAUDE.md) and hash-compares each one
with what was last shipped:

- File untouched locally → overwrite with the new version.
- File modified locally → **keep the local copy**, report the path.
- File new in this version → create.
- File removed upstream and untouched locally → delete.
- File removed upstream but modified locally → keep, warn.

## Steps

### 1. Run the sync

Execute in the terminal:

```bash
npx nova-spec@latest sync
```

Show the output to the user verbatim. The CLI already produces a complete,
sectioned report (`+ new`, `↻ updated`, `⚠ NOT updated`, `− removed`,
`⚠ removed upstream but kept`). Don't summarize away its content.

### 2. Highlight skipped files

If the report contains any `⚠ ... NOT updated (you have local edits)`
entries, append a one-line nudge for each:

```
→ run /nova-diff <path> to compare your version with the new upstream one.
```

Don't auto-merge anything. The user decides whether to keep, merge, or revert.

### 3. Wrap up

Tell the user the sync is done. Mention the new version (printed at the top
of the CLI output) so they know what they're now running.

## Rules

- Don't modify any file beyond what the CLI does.
- If `npx nova-spec@latest sync` exits non-zero, show the error verbatim and stop.
- Don't invent files — only report what the CLI listed.
