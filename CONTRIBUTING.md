# Contributing to nova-spec

nova-spec is an opinionated Spec-Driven Development framework on top of Claude Code. It targets small teams; external contributions are welcome, but a well-framed issue is more valuable than a large PR.

## Before you write code

1. Open a GitHub issue describing the problem or proposal.
2. Wait for feedback if the change is > 30 minutes of work. For obvious changes (typos, doc fixes) you can go straight to PR.

## Flow

nova-spec dogfoods itself. For non-trivial changes:

```bash
/nova-start <TICKET>   # pulls context and creates branch
/nova-spec             # closes decisions, generates proposal.md
/nova-plan             # plan.md + tasks.md
/nova-build            # implements task by task
/nova-review           # review against spec and conventions
/nova-wrap             # updates memory, commit and PR
```

For small fixes skip `/nova-spec` and `/nova-plan` — the ticket marks them as `quick-fix`.

## Branch convention

- `feature/<TICKET>-<kebab-slug>` — new capability.
- `fix/<TICKET>-<kebab-slug>` — bug fix.
- `arch/<TICKET>-<kebab-slug>` — architecture change, requires ADR.

Base branch: `main`.

## What goes to git and what doesn't

- Team coordination (decisions, gotchas, services, changes) → git.
- Personal scratch, `.env`, real `config.yml`, symlinks → local (see `.gitignore`).

## Style

- **English**. The framework is written in English.
- Atomic markdown: one fact per file under `context/decisions/`; filename = index (e.g. `symlinks-vs-copy.md`, not `ADR-0042.md`).
- No frontmatter in memory, no global numbering.
- Conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`).

## Tests

No automated suite. Verification is the manual smoke test documented in each `proposal.md` plus human review.

## Questions

Open a GitHub issue with the `question` label.
