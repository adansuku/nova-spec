---
name: write-decision
description: Create a file in context/decisions/ when a real technical decision with an alternative is made.
---

# Write decision

Create an atomic markdown file under `context/decisions/`. No numbering, no frontmatter, concept-name.

## When to create

- **Yes**: choice between real technical alternatives with trade-off, change of an established pattern, new dependency, decision another dev (or you in 6 months) should know.
- **No**: bug fixes, cosmetic refactor, already-documented patterns, claims with no alternative explored.

Default: **don't write**. Most tickets don't generate a decision.

## Steps

### 1. Filename

`<concept-kebab-case>.md`. Examples: `symlinks-vs-copy.md`, `guardrails-per-step.md`. **Do not** use `NNNN-` numbering. The name is the index; greppping by concept is faster than greppping by number.

### 2. Does it supersede a previous decision?

If yes:
- The new file starts with a line `> Supersedes: <old-file>.md`.
- Run `git mv context/decisions/<old-file>.md context/decisions/archived/<old-file>.md`.
- The `old-decision-archived` guardrail validates this invariant holds.

### 3. Ask for the data

> I need:
> 1. Concept-name for the file
> 2. Decision (one line)
> 3. Discarded alternatives and why (brief)
> 4. Consequences / accepted cost
> 5. Does it supersede an existing decision? (file name)

### 4. Structure

Brief or nothing. Fits on a screen. No mandatory ceremonial sections; the minimum:

```
# <Concept title>

[> Supersedes: <old-file>.md   ← only if applicable]

**Date**: YYYY-MM-DD

## Decision
<one line>

## Discarded alternative
<what and why>

## Why
<the real argument>

## Accepted cost
<what we lose>
```

### 5. Confirm before saving

Only write after confirmation.

## Rules

- Don't make up alternatives.
- Fits on a screen or atomicity fails (split into two files).
- One fact, one file. Never update with new info — create another file with supersede.
- Never write directly into `context/decisions/archived/`; archived is `git mv`'s destination, not a creation target.
