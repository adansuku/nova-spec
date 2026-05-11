---
description: The two files loaded at every ticket so the agent matches your stack and patterns.
---

# Stack & conventions

Two files in the project's `context/` directory are loaded by the [`context-loader` agent](../flow/overview.md) at the start of **every** `/nova-start`:

```text
context/stack.md         ← what tech you use
context/conventions.md   ← what patterns and "we don't do that here"
```

The installer creates both with HTML-comment guides explaining what to put inside. They're not required (the framework still works without them), but they remove 80% of the "explain my project to the agent every time" friction.

## stack.md

Purpose: tell the agent what languages, frameworks, runtimes, and key dependencies you use. Versions matter; philosophy doesn't.

### Default scaffold

```markdown
<!--
  context/stack.md — describe the technology stack of this project.
  Loaded at the start of every ticket. Keep it short and factual.
  Update whenever you upgrade a major dependency.
-->

# Stack

## Language & runtime
- e.g. Node.js 20.x  /  Ruby 3.3  /  Python 3.12

## Framework
- e.g. Next.js 14 (App Router)  /  Rails 7.1  /  FastAPI 0.110

## Key dependencies
- e.g. PostgreSQL 16, Redis 7, Sidekiq 7
- e.g. tailwindcss, prisma, vitest

## Infrastructure
- e.g. AWS (ECS, RDS), GitHub Actions, Cloudflare Workers
```

### What good looks like

```markdown
# Stack

## Language & runtime
- Node.js 20.18 (pinned via .nvmrc)
- TypeScript 5.4 (strict mode)

## Framework
- Next.js 14.2 (App Router)
- React 18.3, Server Components default

## Key dependencies
- PostgreSQL 16 via Prisma 5.x
- Redis 7 via ioredis (queue + cache)
- TanStack Query 5 for client cache
- Vitest + Testing Library

## Infrastructure
- Vercel (production)
- GitHub Actions (CI)
- Sentry, Datadog
```

### What to avoid

* Generic statements: *"We use modern JavaScript"* — useless.
* Philosophy: *"We believe in simple code"* — that's `conventions.md`.
* Bullet lists 60 lines long — trim to what an agent needs to make decisions.

## conventions.md

Purpose: list the **non-obvious** rules. Things that don't show up by reading the code casually, but that the agent needs to respect.

### Default scaffold

```markdown
<!--
  context/conventions.md — house rules and patterns for this codebase.
  Loaded at the start of every ticket. List what is NOT obvious from the code.
  One line per rule is fine.
-->

# Conventions

## Code style
- e.g. 2-space indent, single quotes, trailing commas
- e.g. functional components only; no class components
- e.g. no default exports

## Patterns we follow
- e.g. service layer for all DB access; controllers stay thin
- e.g. errors as values, not thrown (Result/Either)
- e.g. one component per file

## Patterns we avoid
- e.g. no global mutable state
- e.g. no `any` in TypeScript
- e.g. no inline styles

## Tests
- e.g. characterization tests before refactoring
- e.g. one assertion per test
- e.g. fixtures in __fixtures__/, not inline
```

### What good looks like

```markdown
# Conventions

## Code style
- 2-space indent, single quotes, trailing commas everywhere
- ESLint + Prettier are source of truth (run `npm run lint`)
- Named exports only — no default exports anywhere
- File names: kebab-case for utilities, PascalCase for components

## Patterns we follow
- All DB access through `src/db/` repo layer; never `prisma.` in components
- Errors as values via `neverthrow.Result`; never `throw` outside infra layer
- Server Actions for mutations; no `/api` routes for internal use
- `useQuery` keys follow `[entity, id, ...filters]` shape

## Patterns we avoid
- No `any`, no `as` casts (except in `src/db/raw/`)
- No inline styles or `style={{...}}` — Tailwind only
- No `useEffect` for data fetching; use `useQuery`/Server Components
- No bare `process.env.X` outside `src/env.ts`

## Tests
- Vitest. Co-located `*.test.ts` next to source
- Snapshot tests are banned outside `e2e/` — they rot
- Always run `npm test` before committing; CI is not a linter
```

### What to avoid

* Things obvious from the code: "we use TypeScript".
* Aspirations: "we should write more tests" — write what's actually enforced.
* Vague rules: "code should be clean" — concrete or omit.
* Multi-paragraph explanations — that's `decisions/`, not `conventions/`.

## When to update them

* `stack.md` → when you upgrade a major version, swap a database, or change deployment target.
* `conventions.md` → when a code review surfaces a rule the agent should have known. Add the rule, future tickets won't repeat the mistake.

Both files are plain markdown in your repo. Commit them. Treat them like any other source file.

## How `context-loader` uses them

```text
1. Read context/stack.md (always, if exists)
2. Read context/conventions.md (always, if exists)
3. Read context/services/<svc>.md for each affected service
4. Pick 3-5 relevant decisions and gotchas based on names matching the ticket scope
5. Return a structured summary
```

Token budget: ≤3000 tokens total. If `stack.md` + `conventions.md` get too long, the agent trims the decisions/gotchas it loads — so keep these two files focused.

## Files NOT to edit

The framework also reads:

* `context/services/<name>.md` — owned by `update-service-context` (called from `/nova-wrap`)
* `context/decisions/*.md` — owned by `write-decision` (called from `/nova-wrap`)
* `context/gotchas/*.md` — written manually or via `/nova-wrap` prompt

You CAN edit those by hand any time, but the framework keeps them coherent. See [Architecture → Memory model](../architecture/memory-model.md).
