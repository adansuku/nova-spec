<!--
  context/decisions/ — One file per architectural decision.

  Each file captures: WHAT we decided, WHY, what alternatives we
  considered, what trade-offs we accept.

  The AI agent reads 3-5 of these on every ticket whose scope matches
  the filenames. Good decisions here = the agent makes consistent
  choices without asking. Bad / missing decisions = inconsistency
  over time.

  WHEN TO WRITE ONE
    - Any choice with a real alternative and trade-off.
    - /nova-wrap prompts you after each ticket — say yes when there
      was a real decision.
    - You can also write decisions by hand at any time.

  WHEN NOT TO WRITE ONE
    - Cosmetic choices (style, naming) → conventions.md
    - Single-option situations (no alternative existed)
    - Things obvious from the code itself
-->

# Decisions — guide

## Filename convention

- **kebab-case**: `throttling-strategy.md`, `redis-vs-memcached.md`, `session-storage.md`
- The filename **is** the index — make it descriptive. No prefixes (`0042-`), no frontmatter.
- One decision per file. If you find yourself writing two decisions, split them.

## Suggested structure

```markdown
# <decision in one line>

## Context
Why is this even a question? What constraints / forces created the choice?

## Decision
What did we choose, in one paragraph.

## Alternatives considered
- **Option A**: <one line description>
  - Pros: ...
  - Cons: ...
- **Option B**: <one line description>
  - Pros: ...
  - Cons: ...

## Consequences
- What changes because of this?
- What did we accept? (cost / limitation / risk)

> Supersedes: <previous-decision>.md  ← only if this replaces an older one
```

## Superseding

When a decision is replaced:

1. New file includes the trailer: `> Supersedes: <old-name>.md`
2. Run: `git mv context/decisions/<old-name>.md context/decisions/archived/<old-name>.md`
3. Guardrail #6 (`old-decision-archived`) verifies this invariant when you run `/nova-wrap`.

The old decision is **archived, never deleted**: future readers may want to know what we used to think.
