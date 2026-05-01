# nova-spec Architecture

## Purpose

Spec-Driven Development (SDD) framework that structures the ticket→PR cycle for Claude Code.

## Why it exists

- Tickets arrive vague
- Architectural context lives inside senior engineers' heads
- Decisions get lost between sessions
- Juniors take weeks to become productive

## SDD Flow

```
Ticket → /nova-start → /nova-spec → /nova-plan 
→ /nova-build → /nova-review → /nova-wrap → PR
```

## Memory layers

| Layer   | Where | Cycle |
|---------|-------|-------|
| Session | Claude Code context | Hours |
| Project | `context/changes/active/` | Weeks |
| System  | `context/decisions/`, `context/gotchas/`, `context/services/` | Years |
| Org     | Base repo (templates) | Permanent |

Memory model: one fact → one file, filename = index, explicit supersede (`git mv` to `decisions/archived/`), `load-context` budget ≤ 3000 tokens.

## Ticket classification

| Type         | When | Flow |
|--------------|------|------|
| quick-fix    | Bug < 2h | start→build→wrap |
| feature      | Feature 2h-3d | Full |
| architecture | Rewrite > 3d | Full + decision documented in `context/decisions/` |

## Non-negotiable

1. Don't skip steps (the order exists by design)
2. Don't make up context (ask if missing)
3. Human checkpoints after spec and before wrap
4. Feed memory on close

## Extensible

- Add skills in `novaspec/skills/`
- Add commands in `novaspec/commands/`
- Templates in `novaspec/templates/`
- Config in `novaspec/config.yml`
