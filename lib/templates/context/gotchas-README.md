<!--
  context/gotchas/ — Non-obvious traps in this codebase.

  A "gotcha" is something a developer (you, your teammate, your future
  self) will rediscover painfully unless documented.

  EXAMPLES OF REAL GOTCHAS
    - "Redis keys with ':' collide with our cluster routing prefix"
    - "PostgreSQL TIMESTAMP (without TZ) silently drops timezone on write"
    - "The auth/legacy/ directory looks deprecated but powers v1 mobile in prod"
    - "AWS SES sandbox limits emails to verified addresses — staging fails silently"

  EXAMPLES OF NOT-GOTCHAS (do NOT put these here)
    - Things explained by the README
    - Style preferences → conventions.md
    - Bug reports → your ticket tracker
    - One-off bug fixes → just fix them, don't document

  RULE OF THUMB
    Write a gotcha after wasting 30+ minutes on something that wasn't
    obvious. The next person (or future-you) will thank you.
-->

# Gotchas — guide

## Filename convention

- **kebab-case** describing the trap: `redis-key-collision.md`, `tz-drop-on-write.md`
- Short, atomic — one trap per file.

## Suggested structure

```markdown
# <one-line description of the trap>

## What happens
The surprising / confusing behavior.

## Why
The non-obvious reason. Include code references if helpful.

## How to avoid
Concrete advice — what to do instead.

## How to recover (if you already fell into it)
Steps to fix the damage.
```

## When to write one

**After you waste 30+ minutes** on something that wasn't obvious. Write
it before the next ticket starts — present-you remembers; future-you
won't.
