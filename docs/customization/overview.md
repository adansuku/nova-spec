---
description: How to customize nova-spec — the edit-in-place model and how sync respects your changes.
---

# Customization overview

nova-spec uses an **edit-in-place** model. There is no `custom/` overlay folder, no `.resolved/` build step, no override resolution. You edit framework files where they live, and `sync` is smart enough not to clobber your edits.

## The mental model in three lines

```text
You edit  novaspec/templates/pr-body.md
The hash of that file no longer matches the last-shipped hash recorded in the manifest
On the next sync, that file is skipped + reported as "you have local edits"
```

Everything else is implementation detail.

## What you can edit

Anything inside `novaspec/` — and `AGENTS.md` and `CLAUDE.md` at the top level. The framework treats every file the same way: if you've changed it, sync leaves it alone.

| Type | Where | Examples |
|---|---|---|
| Slash commands | `novaspec/commands/` | `nova-wrap.md`, `nova-review.md` |
| Skills | `novaspec/skills/<name>/SKILL.md` | `close-requirement`, `jira-integration` |
| Sub-agents | `novaspec/agents/` | `context-loader.md`, `nova-review-agent.md` |
| Templates | `novaspec/templates/` | `pr-body.md`, `commit.md`, `review.md`, ... |
| Guardrails | `novaspec/guardrails/` | `checklist.md`, `proposal-closed.sh`, `review-checks.sh` |
| Repo anchor | `AGENTS.md` | First thing the agent reads when entering the repo |

## The 5 things your team will likely want to change

1. **[PR / MR template](pr-template.md)** → `novaspec/templates/pr-body.md`
   Add your team's QA checklist, ticket-link format, security/privacy notes.

2. **[Code review checklist](review-checklist.md)** → `novaspec/templates/review.md`
   Adjust the structure `nova-review` follows. Add custom sections, remove ones you don't use.

3. **[Commit message format](commit-format.md)** → `novaspec/templates/commit.md`
   Conventional commits, custom prefixes, ticket-in-subject — whatever your team enforces.

4. **[Ticket system](ticket-system.md)** → `novaspec/config.yml` → `ticket_system`
   `jira` for Atlassian Jira, `none` to paste tickets manually. `none` skips ticket-key validation in `/nova-start`.

5. **[Stack & conventions](stack-conventions.md)** → `context/stack.md` and `context/conventions.md`
   The two files loaded at the start of **every** ticket so the agent knows your tech and patterns.

## Less obvious tweaks

| Want | Where |
|---|---|
| Force `/nova-plan` to require certain sections in `proposal.md` | Edit `novaspec/guardrails/proposal-closed.sh` (add greps) |
| Add an extra deterministic check before `/nova-review` LLM passes | Edit `novaspec/guardrails/review-checks.sh` |
| Branch types specific to your team | `novaspec/config.yml` → `branch.types` |
| Different forge CLI | `novaspec/config.yml` → `forge.cli` |
| Different Jira "Done" transition | `novaspec/config.yml` → `jira.transitions.done` |

## Commit your customizations

In a project install, the `.gitignore` block nova-spec adds covers only the personal/secret bits:

```text
novaspec/config.yml
novaspec/.nova-manifest.json
.env
notes.md
.claude/settings.local.json
.opencode/settings.local.json
```

**Templates, commands, skills, agents and guardrails are NOT gitignored.** Your edits become part of the repo. When a teammate clones, they get your customized flow.

## What sync does with your edits

When `npx nova-spec sync` runs (manually or via the auto-sync hook):

| State | What sync does |
|---|---|
| File didn't exist locally | Creates it (new in this version) |
| File matches last-shipped hash | Overwrites with the new version (you didn't touch it) |
| File differs from last-shipped hash | **Skips it** + reports `⚠ NOT updated (you have local edits)` |
| File removed upstream, untouched locally | Deletes it |
| File removed upstream, but you edited it | Keeps it + warns |

## When upstream changes a file you've edited

The sync report points you at `/nova-diff <path>`. That command:

1. Locates the package version of the file (via `npx nova-spec source <path>`)
2. Diffs your local copy against it
3. Asks you to **Keep**, **Merge manually**, or **Replace**

Nothing is auto-applied. You always decide.

See [`/nova-diff`](../flow/overview.md) for details.

## Why no custom/ folder

The earlier design used `novaspec/custom/<section>/X.md` to override `novaspec/<section>/X.md` via a built `.resolved/` layer. It worked but added concepts (core / custom / resolved / outdated_customs) and three indirection paths every command had to know about.

The edit-in-place model has the same end result with one concept: **your file, your edit, your repo**. Sync handles the rest. See [Architecture → Sync internals](../architecture/sync-internals.md) for the design rationale.
