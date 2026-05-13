<!--
  context/ — Architectural memory of this project.

  Loaded by nova-spec on every ticket so the AI agent knows your code,
  conventions, and prior decisions WITHOUT you re-explaining them.

  Survives tool changes: if Claude Code disappears tomorrow, this
  directory still tells your team's story.
-->

# Memory map

| Directory | What goes here | When to update |
|---|---|---|
| `stack.md` | Tech stack, versions, key dependencies | On major upgrades |
| `conventions.md` | Code style, patterns, anti-patterns | When a code review surfaces a missing rule |
| `decisions/` | One file per architectural decision | `/nova-wrap` prompts you; can write by hand any time |
| `decisions/archived/` | Superseded decisions (never deleted) | `git mv` from `decisions/` when superseded |
| `gotchas/` | Non-obvious traps a future dev would rediscover | After wasting 30+ minutes on something subtle |
| `services/` | One file per service, ≤80 lines, public interface | `/nova-wrap` rewrites when interface changes |
| `changes/active/` | Specs of tickets in progress | Auto-managed by `/nova-spec` and `/nova-plan` |
| `changes/archive/` | Closed tickets (read-only history) | Auto-managed by `/nova-wrap` |

## Golden rules

1. **One fact = one file.** Don't aggregate.
2. **Filename = index.** No numbering, no frontmatter. Use kebab-case.
3. **Supersede explicitly:** add `> Supersedes: <old>.md` and `git mv` the old file to `archived/`.
4. **Replace, don't accumulate** (services only): rewrite from scratch, ≤80 lines.

The `README.md` files inside each subdirectory go into more detail.
