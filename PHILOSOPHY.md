# Philosophy

> **Simple. The developer controls the framework, not the other way around.**

This document is the antibody to scope creep. Read it before adding a feature, before adopting nova-spec in a new team, and before saying yes to a feature request.

If a future version of nova-spec is "richer" but no longer fits this document, **the document wins**. We will remove features to defend the philosophy. We will not change the philosophy to justify features.

---

## Core principles

### 1. Form, not substance

nova-spec enforces **shape** — sequence, file structure, naming conventions. It does **not** enforce **quality** — whether your spec is good, whether your decision is right, whether your code is correct. Quality is the developer's job.

A check that requires LLM judgment to evaluate is not a guardrail. It's a suggestion. Don't dress it up as the former. Real guardrails are deterministic (e.g. `guardrails/old-decision-archived.md`: bash, file existence, exit code). Everything else is a check or a convention — call it that.

### 2. Plain markdown, no DSLs

Specs, decisions, gotchas, services, templates — all plain markdown. No frontmatter required except where Claude Code demands it for slash commands and skills. No schema enforcement. No build step.

If a junior cannot open `context/decisions/<x>.md` and understand the decision in 30 seconds, the file is wrong, not the format.

### 3. No hidden state

Everything lives in git: `context/`, `novaspec/`, `AGENTS.md`. No database, no daemon, no telemetry, no cloud component. If Claude Code disappears tomorrow, your repo still tells the full story.

This is the property that makes nova-spec survivable across tool changes. Defend it.

### 4. Atomic memory

One fact = one file. Filename = index (no `NNNN-` prefixes, no global numbering, no frontmatter). Supersede explicitly with `> Supersedes: <old>.md` and `git mv` the old file to `archived/`. The bash validator in `guardrails/old-decision-archived.md` enforces this invariant — that is a real guardrail because it is deterministic and exits non-zero.

### 5. The developer can always escape

If a phase gate gets in the way of real work, the developer can:

- Skip it manually (touch the expected file, mark a task done by hand)
- Edit the relevant command in their own `novaspec/commands/` and re-run
- Bypass nova-spec entirely and use Claude Code raw

The framework must never be the reason a developer cannot ship.

---

## In scope

- Ticket → branch → spec → plan → build → review → wrap workflow
- Atomic markdown memory: `decisions/`, `gotchas/`, `services/`
- Slash commands for Claude Code and OpenCode (via symlinks)
- Optional Jira integration as one skill (opt-in via `config.yml`)
- Phase gates that enforce **sequence** (file existence, branch shape)
- Human checkpoints where review materially matters (post-spec, pre-wrap)
- Templates as starting points

That's the surface. Everything else needs an explicit decision.

---

## Out of scope (we will say no)

We say no to:

- **CI/CD integration.** Your CI is your team's concern.
- **Cross-repo coordination.** One repo = one nova-spec instance.
- **Auto-merge or auto-approve PRs.** Humans decide.
- **Hosted memory, DB, or cloud component.** Markdown in git is the system of record.
- **Issue tracker abstraction layer.** Jira is the integrated path; Linear/GitHub Issues/Asana = fork the skill, don't extend core.
- **Real-time collaboration features.** Git handles concurrency.
- **Telemetry or metrics dashboards.** Out of scope by principle.
- **Auto-generated tests or auto-style fixes.** The dev decides what to test and how to style.
- **Plugins beyond markdown skills.** If it requires a runtime, server, or daemon, it does not belong in nova-spec.
- **Multi-tenant config.** One project = one `config.yml`.
- **Bypassable LLM-judgment-based blocks.** A "guardrail" that depends on the model reading carefully is not a guardrail.

This list is allowed to grow. It is not allowed to shrink without justification.

---

## Decision criteria for new features

Before merging a feature, the answer to all five must be acceptable:

1. **Form or substance?** If it enforces substance, reject.
2. **Is the runtime cost zero?** If it requires a server, daemon, DB, or external service, reject.
3. **Can a junior understand it in 5 minutes from the file alone?** If not, simplify or reject.
4. **Could a 10-line fork in the consuming repo achieve the same result?** If yes, don't add to core. Document the fork pattern instead.
5. **Does it survive if Claude Code is replaced by another tool tomorrow?** If no, think hard.

We accept living without features. We do not accept living with bloat. The cost of saying no is borne by one team. The cost of saying yes is borne by every team that adopts nova-spec from then on.

---

## Forking and customization

**Today.** Updates are applied with `npx nova-spec sync`, which is idempotent and will not overwrite local edits to stock framework files. Sync records the last-shipped hashes in `novaspec/.nova-manifest.json` and:

- Updates files that are still untouched locally
- Skips files you edited and reports them so you can merge intentionally

This keeps the framework from being the reason you can't ship: your local edits remain yours.

If you need deeper customization, commit it in your repo (or fork nova-spec). When upstream changes touch files you customized, sync will intentionally refuse to overwrite them — you choose how to merge.

---

## How another team adopts nova-spec

This is not a sales pitch. It is the contract:

1. You will read this document. If anything here is incompatible with how your team works, do not adopt nova-spec — pick a tool whose philosophy fits.
2. You will pin to a tagged version (e.g. `v0.x.y`). You will not track `main`.
3. If you need something nova-spec does not have, you fork. You do not block on us merging your change.
4. If your fork generalizes, open a PR with rationale against the decision criteria above.
5. We do not promise backward compatibility across major versions. We do promise to document breaking changes in the release notes.

If those terms are unacceptable, OpenSpec or GitHub Spec Kit are externally maintained alternatives — adopt those instead. We won't be offended.

---

## Review cadence

Every 3 months, the maintainers re-read this file and answer in writing:

- Has any principle been quietly violated?
- Has any "out of scope" item snuck in?
- Has the lema started to feel like a slogan instead of a practice?
- Are we saying yes to feature requests we should be saying no to?

If yes to any: revert or remove the offending feature, or rewrite the relevant principle to acknowledge the change explicitly. **The framework is allowed to lose features. It is not allowed to lose its soul.**

---

## Maintainer's commitment

The maintainers commit to:

- Saying no to feature requests that violate this document, even from people they like.
- Defending simplicity over completeness when the two conflict.
- Treating "we already built it" as a reason to remove, not a reason to keep.
- Writing down what we removed and why, in `context/decisions/`.

The maintainers do **not** commit to:

- Long-term backward compatibility.
- Supporting every team's specific tooling.
- Accepting every PR that "would be useful."
- Replacing tools that already do the job better externally.
