---
description: Bootstrap context/ (stack, conventions, services) from an existing codebase — one-time use after install
argument-hint: [optional: comma-separated paths to focus on, e.g. apps/auth,apps/billing]
---

You bootstrap the architectural memory for a team that just adopted
nova-spec on a codebase **that already exists**. Without this command,
the team would either:

- Type `context/stack.md`, `context/conventions.md`, and each
  `context/services/<svc>.md` by hand → 1-3 hours
- Or let the memory accrue ticket-by-ticket → useful only months later

`/nova-seed` does it in 15-30 minutes by scanning the repo, generating
drafts, and asking you to approve each.

## When to use

- Right after `npx nova-spec init` on an existing project
- After a major restructure that invalidated `context/services/`
- When you join a team and want to refresh the architectural memory

## When NOT to use

- Greenfield project — let memory grow naturally via `/nova-wrap`
- `context/` already has substantial content you want to preserve
  (the command warns, but be deliberate)
- The team has explicitly decided to write everything by hand

## Guardrail

`checklist.md` → 0 (nova-installed)

Other than that, this is a one-shot bootstrap. No spec, no plan, no
ticket required.

## Steps

### 1. Stack — `context/stack.md`

#### Detect

Read these files at the repo root (whichever exist):

- `package.json` — Node ecosystem (look at `engines`, `dependencies`, `devDependencies`)
- `Gemfile` / `Gemfile.lock` — Ruby
- `requirements.txt` / `pyproject.toml` / `Pipfile` / `setup.py` — Python
- `Cargo.toml` — Rust
- `go.mod` — Go
- `pom.xml` / `build.gradle` — JVM
- `composer.json` — PHP
- `Dockerfile` / `docker-compose.yml` — runtime hints

Also look for:
- `.nvmrc` / `.node-version` — exact Node version
- `.ruby-version` / `.python-version` — language version pins
- CI files (`.github/workflows/*.yml`, `.gitlab-ci.yml`) — what versions are tested

#### Check if already populated

Read `context/stack.md`. If it's just the scaffolded template (HTML
comment + `e.g. Node.js 20.x` placeholders), proceed. If it has
substantive content, **stop and ask** the user whether to overwrite
or skip this step.

#### Generate draft

Produce a draft following the structure of `novaspec/templates/services/README.md`'s
example for stacks, but specific:

```markdown
# Stack

## Language & runtime
- <name> <version> (from <source: package.json, .nvmrc, etc.>)

## Framework
- <inferred from main dependencies>

## Key dependencies
- <DB, cache, queue from package.json+docker-compose+env vars>

## Infrastructure
- <inferred from Dockerfile, CI, hosting hints>
```

Show the draft. The user can:
- **Approve**: write it
- **Edit**: open it in their editor, save when done
- **Skip**: don't touch stack.md

### 2. Conventions — `context/conventions.md`

#### Detect

- `.eslintrc*` / `eslint.config.*` — JS style rules
- `.prettierrc*` — formatting
- `.editorconfig` — indent, line-endings
- `tsconfig.json` — TS strict mode, noImplicitAny, etc.
- `.rubocop.yml` — Ruby style
- `pyproject.toml` `[tool.ruff]` / `.flake8` / `.pylintrc` — Python
- `.golangci.yml` — Go
- `.github/CODEOWNERS` — who owns what

Read also any `CONTRIBUTING.md` or `STYLE.md` at the repo root.

#### Check if already populated

Same as stack: if `context/conventions.md` is just the template,
proceed. Otherwise ask.

#### Generate draft

Pull facts from configs into a `Conventions` document:

```markdown
# Conventions

## Code style
- <indent, quotes, semicolons from .editorconfig / prettier>
- <strict mode flags from tsconfig>
- <export style: default vs named, from observed patterns>

## Patterns we follow
- <linter rules that ENABLE specific patterns>

## Patterns we avoid
- <linter rules that ban specific patterns>

## Tests
- <test framework detected from package.json / Gemfile / etc.>
- <test file pattern: e.g. *.test.ts colocated, or __tests__/>
```

Show, approve / edit / skip.

### 3. Services — `context/services/<name>.md`

#### Detect candidates

Try in this order, stop at the first that returns matches:

**a) Monorepo with workspaces**
- `package.json` → `workspaces` array
- `lerna.json`, `nx.json`, `turbo.json`, `pnpm-workspace.yaml`
- Each workspace path = one candidate

**b) Apps / packages / services directories**
- If `apps/`, `packages/`, `services/`, `modules/` exists at root
- Each immediate subdirectory = one candidate

**c) Source layout**
- Top-level subdirs of `src/` that have their own `index.{ts,js,py,rb,go}`
  or `package.json` / `setup.py` / `Cargo.toml`

**d) Single-app fallback**
- If none of the above and it's a flat repo: there's ONE service.
  Use the repo name (from `package.json` / directory name) as the
  service name.

If `$ARGUMENTS` was non-empty, **treat it as a comma-separated list of
paths** and use only those — skip detection. Useful when the user knows
exactly which services to seed.

#### Present and confirm

```text
Detected 4 candidate services:
  1. auth-api      (apps/auth-api/)
  2. billing-api   (apps/billing-api/)
  3. notifications (apps/notifications/)
  4. shared        (packages/shared/)

For each, I'll read a few key files and draft context/services/<svc>.md.

Proceed with all 4? [y/n/edit]
```

If `edit`, ask the user to type which to keep / drop / rename.

#### Check for existing service files

For each confirmed candidate, look at `context/services/<name>.md`.
If it exists with substantive content (not just the scaffolded template),
**ask before overwriting**.

#### Per-service draft

For each service:

1. Read its `README.md` if it exists.
2. Read its `package.json` / `pyproject.toml` / equivalent for name, version, deps.
3. Read its entry file (`index.*`, `main.*`, `app.*`).
4. Scan for routes: `*.routes.*`, `*Controller.*`, `app.get/post`, `@app.route`, etc.
5. Scan for exports / public types: top-level `export`s, type definitions, schemas.
6. Read up to 5 most-relevant files (don't pull dozens).

Generate the draft using the structure in the `services/README.md`
template. **Target ≤80 lines.** If the service is too large for 80
lines, split into multiple files with descriptive suffixes:
`auth-api-routes.md`, `auth-api-middleware.md`, etc.

Show the draft. Approve / edit / skip.

### 4. Decisions and gotchas

**Don't auto-seed these.** They need human judgment about what's worth
documenting. The agent can OPTIONALLY suggest things it noticed during
service scanning (e.g. "I saw both Redis and Memcached in the deps — was
that a deliberate choice?"). The user decides whether to document.

### 5. Summary

```text
## /nova-seed complete

Stack:        ✓ written (24 lines)        OR  ⊝ skipped  OR  ⏭ already populated
Conventions:  ✓ written (31 lines)        OR  ⊝ skipped
Services:
  + auth-api.md       (61 lines)
  + billing-api.md    (47 lines)
  ⊝ notifications     (skipped by user)
  + shared.md         (29 lines)

These files are now loaded by context-loader on every /nova-start.
/nova-wrap will keep them up to date as you ship tickets.

Suggested next steps:
  - git add context/ && git commit -m "chore: seed architectural memory"
  - Push so the rest of your team gets the same starting point.
```

## Rules

- **≤80 lines per service file.** If the service is huge, split it.
- **Never overwrite without explicit confirmation.** Use `writeIfMissing`
  semantics — but for this command, "missing" means "doesn't exist OR
  matches the scaffolded template byte-for-byte". User edits are sacred.
- **One commit at the end** is recommended, with subject `chore: seed
  architectural memory from /nova-seed`. Don't auto-commit — let the
  user review the diff first.
- **Don't seed decisions / gotchas.** Those are human judgment calls.
- **If the user re-runs `/nova-seed` after the first pass**, treat every
  existing service file as "user content" and ask before touching.
