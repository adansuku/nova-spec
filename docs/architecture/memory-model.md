---
description: How nova-spec stores architectural memory in atomic markdown files.
---

# Memory model

The memory model is the part of nova-spec that survives tool churn. Markdown files in `context/`, one fact per file, kept coherent by skills called from `/nova-wrap`.

## The directories

```text
context/
├── stack.md                 # tech stack — loaded every ticket
├── conventions.md           # patterns and house rules — loaded every ticket
├── decisions/               # why we did X (one fact = one file)
│   ├── throttling-strategy.md
│   ├── redis-usage.md
│   └── archived/            # superseded — never auto-loaded
│       └── old-rate-limit.md
├── gotchas/                 # non-obvious traps
│   ├── redis-key-collision.md
│   └── timezone-on-write.md
├── services/                # one file per service, ≤80 lines, replace not accumulate
│   ├── auth-api.md
│   └── billing-api.md
├── changes/
│   ├── active/              # in-progress specs
│   │   └── PROJ-42/
│   │       ├── proposal.md
│   │       ├── tasks.md
│   │       └── review.md
│   └── archive/             # closed specs (after /nova-wrap)
│       └── PROJ-41/...
└── backlog/                 # pending proposals (gitignored by default)
```

## The four golden rules

1. **One fact = one file.** Don't aggregate decisions, gotchas, or services into a single page. Each gets its own file with a descriptive filename.
2. **Filename is the index.** No `0001-`, `NNNN-` prefixes, no global numbering, no front-matter required. The filename describes the fact: `throttling-strategy.md`, `redis-key-collision.md`, `auth-api.md`.
3. **Supersede explicitly.** When a decision is replaced, the new file includes `> Supersedes: <old>.md` and the old file moves to `archived/` via `git mv`. Guardrail #6 (`old-decision-archived`) blocks `/nova-wrap` if a supersede ref points at a file still at root.
4. **Replace, don't accumulate** (services only). `context/services/<svc>.md` is a snapshot of the current public interface, ≤80 lines. Each `/nova-wrap` rewrites it from scratch when the service changed. No "history" inside the file.

## Why this shape

* **Plain markdown** so a junior can grep, open, understand in 30 seconds.
* **No frontmatter, no schema** so there's nothing to validate, no build step.
* **No global ordering** so two devs creating files at the same time can't conflict on numbering.
* **No history inside files** because `git log` is the history. The file is the *current* state.

The full justification lives in [PHILOSOPHY.md](https://github.com/Adansuku/nova-spec/blob/main/PHILOSOPHY.md) under "Atomic memory".

## Loaded vs not loaded

| Location | Loaded by `context-loader` at `/nova-start`? |
|---|---|
| `context/stack.md` | Always |
| `context/conventions.md` | Always |
| `context/services/<svc>.md` | If `<svc>` is in the ticket's affected services |
| `context/decisions/*.md` | 3-5 files whose names match the ticket scope |
| `context/decisions/archived/*.md` | **Never** (explicitly skipped) |
| `context/gotchas/*.md` | 3-5 files whose names match the ticket scope |
| `context/changes/active/*` | Only by commands that act on a specific ticket |
| `context/changes/archive/*` | Only by `/nova-status` when reporting on archived tickets |
| `context/backlog/*` | Never automatically — for human reading |

The agent stays under a 3000-token budget for `context-loader`. If `stack.md` + `conventions.md` are huge, fewer decisions/gotchas get loaded.

## The skills that maintain it

Three skills are invoked from `/nova-wrap`:

### `write-decision`
**When**: a real architectural choice was made with an alternative and a trade-off.
**Writes**: `context/decisions/<concept>.md`. The agent picks a descriptive name, writes the decision in plain markdown.
**Supersede**: if the agent identifies that this replaces an existing decision, it adds `> Supersedes: <old>.md` and runs `git mv context/decisions/<old>.md context/decisions/archived/<old>.md`. Guardrail #6 verifies this invariant.

### `update-service-context`
**When**: a service's **public interface** changed in this ticket.
**Writes**: rewrites `context/services/<svc>.md` from scratch. Target ≤80 lines. Old content is replaced, not appended.
**Format**: pragmatic — endpoints/exports/key types/schemas. Whatever helps the next ticket understand "what does this service expose".

### Gotcha capture
**When**: during the build, the agent discovered something counterintuitive that another developer would rediscover.
**Writes**: `context/gotchas/<concept>.md`. Atomic, brief — one paragraph max.
**Default**: don't write. Most tickets don't generate a gotcha.

`/nova-wrap` walks all three in order, asks the user for each, and only writes when the user confirms.

## Anti-patterns

These violate the memory model. Don't do them:

| Anti-pattern | Why bad | What to do instead |
|---|---|---|
| `decisions/all-decisions.md` with 30 H2 sections | One file = many facts; impossible to grep, impossible to supersede | One file per decision |
| `decisions/0042-throttling-strategy.md` | Numbering creates conflicts and obscures the actual content | Drop the prefix; use the descriptive name |
| `services/services.md` listing all services | Same: one file per service | One per service, ≤80 lines |
| `decisions/old-deprecated-foo.md` left at root | Confuses the loader, which thinks it's still relevant | Move to `archived/` with `git mv` |
| Front-matter blocks at the top | Not needed; nothing reads them | Just write markdown |
| `> Supersedes: <X>.md` without moving `<X>.md` | Guardrail #6 blocks `/nova-wrap` | `git mv` the old file |
| Multi-paragraph "gotchas" | Defeats the "atomic" property | Split into multiple gotcha files |

## Why no database or daemon

Three reasons:

1. **Survives tool change.** If Claude Code disappears tomorrow, your repo still tells the full story. A decision in markdown is independent of any tool.
2. **Reviewable in PR.** Memory updates land in commits. They go through review like any other change.
3. **Greppable.** `grep -r 'rate limit' context/decisions/` is the search engine. No index, no daemon, no flaky service.

The cost: no auto-suggestion, no "show me decisions related to X" UI. The benefit: the model is bulletproof.

## When to edit by hand

Any time. The skills are convenient automation, not gatekeepers. If you discover a gotcha mid-task and want to write it immediately, do — `vim context/gotchas/<concept>.md` and commit it with the change.

## Where it lives

* **Source of truth**: your repo's `context/` directory
* **Versioned**: yes — `context/` is committed (the framework's `.gitignore` only ignores `context/backlog/*` by default)
* **Loaded into agent context**: via `context-loader` at `/nova-start`, with token-budget triage
* **Maintained by**: humans + the three skills called from `/nova-wrap`
