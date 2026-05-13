---
description: One-time bootstrap of context/ (stack, conventions, services) from an existing codebase.
---

# /nova-seed

Most nova-spec commands are part of the day-to-day ticket flow.
`/nova-seed` is the exception: it's a **one-shot bootstrap** for teams
adopting nova-spec on a codebase **that already exists**.

```text
/nova-seed
```

Without it, after `npx nova-spec init` you have a `context/` directory
with empty templates. The team has two choices:

1. Type `stack.md`, `conventions.md`, and every `services/<svc>.md` by
   hand → 1-3 hours of busywork.
2. Let the memory accrue ticket-by-ticket via `/nova-wrap` → useful only
   months later.

`/nova-seed` does it in 15-30 minutes: scans the repo, drafts the files,
asks you to approve each.

## When to use this

- **Right after `npx nova-spec init`** on a repo with existing code.
- **After a major restructure** that invalidated the existing
  `context/services/`.
- **When you join a team** and want to refresh the architectural memory.

## When NOT to use this

- Greenfield project (no real services yet — let memory accrue naturally).
- `context/` already has substantial hand-written content (the command
  asks before overwriting, but be deliberate).
- You prefer to write everything by hand.

## What it does, step by step

### 1. Stack — `context/stack.md`

Reads:

- `package.json` (engines + dependencies)
- `Gemfile` / `pyproject.toml` / `Cargo.toml` / `go.mod` / `pom.xml`
- `.nvmrc`, `.python-version`, `.ruby-version` for exact versions
- `Dockerfile`, `docker-compose.yml` for runtime
- CI files for tested versions

Generates a draft `stack.md`, shows it, asks you to approve / edit / skip.

### 2. Conventions — `context/conventions.md`

Reads:

- `.eslintrc*`, `.prettierrc*`, `.editorconfig`
- `tsconfig.json` (strict, noImplicitAny, etc.)
- `.rubocop.yml`, `[tool.ruff]`, `.flake8`, `.golangci.yml`
- `CONTRIBUTING.md`, `STYLE.md` if present

Pulls style + lint rules into a `conventions.md` draft. Same approve / edit / skip flow.

### 3. Services — `context/services/<name>.md`

Detection cascade (stops at the first that matches):

| Pattern | Source |
|---|---|
| Monorepo workspaces | `package.json → workspaces`, `lerna.json`, `nx.json`, `turbo.json`, `pnpm-workspace.yaml` |
| Apps / packages dirs | `apps/`, `packages/`, `services/`, `modules/` immediate children |
| Source layout | `src/<dir>/` with own entry point |
| Flat repo | Single service, named after the repo |

For each candidate, reads the service's `README.md`, entry file, routes,
exports, and schemas. Generates a draft ≤80 lines. Approve / edit / skip.

**You can override detection** by passing paths explicitly:

```text
/nova-seed apps/auth,apps/billing,packages/shared
```

Only the three you listed are seeded — detection is skipped.

### 4. Decisions and gotchas — NOT auto-seeded

These need human judgment about what's worth documenting. The agent may
**suggest** things it noticed during the scan ("I saw both Redis and
Memcached in deps — was that deliberate?") but it doesn't write the
files. You do, when you have the context.

## Sample session

```text
> /nova-seed

Detected stack: Node.js 20.x, Next.js 14.2, PostgreSQL via Prisma,
Redis via ioredis, Vitest for tests.

  → context/stack.md draft (24 lines)
  [k]eep / [e]dit / [s]kip → k

Detected conventions: 2-space indent, single quotes, named exports
only (from ESLint), strict TypeScript, characterization tests required
(from CONTRIBUTING.md).

  → context/conventions.md draft (31 lines)
  [k]eep / [e]dit / [s]kip → e
  (you edit, save)
  → context/conventions.md written (38 lines, your edits)

Detected 4 candidate services:
  1. auth-api      (apps/auth-api/)
  2. billing-api   (apps/billing-api/)
  3. notifications (apps/notifications/)
  4. shared        (packages/shared/)

Proceed with all 4? [y/n/edit] → y

  → auth-api.md draft (61 lines)
  [k]eep / [e]dit / [s]kip → k

  → billing-api.md draft (47 lines)
  [k]eep / [e]dit / [s]kip → s
  (notifications is unmaintained — we'll remove it next sprint)

  → notifications.md draft (29 lines)
  [k]eep / [e]dit / [s]kip → s

  → shared.md draft (29 lines)
  [k]eep / [e]dit / [s]kip → k

## /nova-seed complete

Stack:        ✓ written (24 lines)
Conventions:  ✓ written (38 lines, with your edits)
Services:
  + auth-api.md      (61 lines)
  ⊝ billing-api      (skipped by user)
  ⊝ notifications    (skipped by user)
  + shared.md        (29 lines)

Suggested next steps:
  - git add context/ && git commit -m "chore: seed architectural memory"
  - Push so the rest of your team gets the same starting point.
```

## After /nova-seed

You don't run it again. The maintenance is automatic:

- `/nova-start` loads stack / conventions / relevant services / decisions on every ticket
- `/nova-wrap → update-service-context` skill rewrites a service file when its public interface changed in the ticket
- `/nova-wrap → write-decision` skill writes a new decision when prompted
- Gotchas you add by hand whenever you discover one

**Re-running `/nova-seed`** is OK if you have a major restructure, but
the command treats existing service files as user content and asks
before overwriting.

## Errors you may see

| Error | Cause | Fix |
|---|---|---|
| `Could not detect any candidate services` | Repo doesn't match any pattern | Pass paths explicitly: `/nova-seed src/foo,src/bar` |
| `context/services/<x>.md already exists with content` | Re-running after first seed | Confirm overwrite, or skip |
| Service draft is too long (>80 lines) | Service is genuinely large | Approve a smaller version, then add `<svc>-extras.md` for the rest, or split the file in the prompt |

## Companion commands

- [`npx nova-spec init`](../reference/cli.md) — runs **before** `/nova-seed`; scaffolds empty `context/`
- [`/nova-start`](nova-start.md) — uses what `/nova-seed` populated
- [`/nova-wrap`](nova-wrap.md) — maintains the memory ticket-by-ticket
- [Architecture → Memory model](../architecture/memory-model.md) — the rules `/nova-seed` follows
