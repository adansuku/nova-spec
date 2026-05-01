# nova-spec Quick Reference

## Commands

`/nova-start <TICKET>` → classify, branch, load context
`/nova-spec` → close requirements, generate spec
`/nova-plan` → tasks (plan + tasks)
`/nova-build` → execute tasks one-by-one
`/nova-review` → final review against spec
`/nova-wrap` → commit, PR, update memory
`/nova-status` → show ticket status

Quick-fix: `/nova-start` → `/nova-build` → `/nova-wrap`

## Structure

```
├── novaspec/          # Framework
│   ├── commands/      # /nova-*
│   ├── skills/        # Auto-loaded
│   ├── agents/        # Subagents
│   ├── guardrails/    # Shared pre-conditions
│   └── templates/
├── context/
│   ├── decisions/     # One fact per file; archived/ is not auto-loaded
│   ├── gotchas/       # Non-obvious traps
│   ├── services/      # Flat <svc>.md, ≤80 lines
│   └── changes/       # Specs active/archive
└── AGENTS.md          # Project instructions
```

## Rules

- Don't skip steps in the flow
- Don't make up context (ask if missing)
- Human checkpoints: after `/nova-spec`, before `/nova-wrap`
- Feed memory on close

## Config

`novaspec/config.yml` — branch pattern, types, base branch
