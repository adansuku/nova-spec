---
name: update-service-context
description: Update context/services/<svc>.md when service behavior changes.
---

# Update `context/services/<svc>.md`

## When to update

- Add/remove responsibilities
- Modify public contracts
- Change integrations
- Introduce new dependencies
- Change observable behavior

**Don't** for internal changes with no external impact.

## Steps

### 1. Check if it exists

The file lives at `context/services/<svc>.md`.

If it doesn't exist, ask whether to create it (recommended).

### 2. Identify changes

Compare previous state vs new.

### 3. Template

Use this basic structure (keep the file ≤80 lines; replace, don't accumulate):

```
# <svc>

## What it does
## Public interfaces
## Dependencies
## Last update: YYYY-MM-DD — <ticket>
```

### 4. Propose diff

```
## Proposed changes
- [before] ...
- [after] ...
```

> "Apply, adjust, or cancel?"

Only write after confirmation.

## Rules

- Don't make up responsibilities
- If it's internal with no impact, don't update
- Short file (≤80 lines)
- Don't repeat decisions here; reference `context/decisions/<file>.md` if applicable
