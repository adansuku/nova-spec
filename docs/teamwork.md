---
description: How a team adopts nova-spec, shares customizations, and stays in sync.
---

# Working as a team

nova-spec is designed to be **the same flow for everyone on the team**, with as little coordination as possible. This page covers how to make that work in practice.

## What's shared, what's personal

| Shared (committed) | Personal (gitignored) |
|---|---|
| `novaspec/commands/*.md` | `novaspec/config.yml` |
| `novaspec/skills/*` | `novaspec/.nova-manifest.json` |
| `novaspec/agents/*` | `.claude/settings.local.json` |
| `novaspec/templates/*` | `.opencode/settings.local.json` |
| `novaspec/guardrails/*` | `.env` |
| `AGENTS.md`, `CLAUDE.md` | `notes.md` |
| `context/stack.md`, `context/conventions.md` | `~/.nova-spec.log` |
| `context/decisions/`, `context/gotchas/`, `context/services/` | |
| `context/changes/active/` and `context/changes/archive/` | |

The **framework files are part of your repo**. When a teammate clones, they get your team's exact flow. When you edit `pr-body.md`, the next merge ships it to everyone.

## Onboarding a new developer

```bash
git clone <your-repo>
cd <your-repo>
npx nova-spec init    # detects the existing install, runs `update` mode
```

The installer:

1. Detects that `novaspec/` already exists
2. Asks for personal config (Jira email, runtime preference)
3. Generates a fresh `config.yml` (the team-wide bits) and `.claude/settings.local.json`
4. **Does not** touch any of the shared framework files — those are already in the repo

If they need a Jira token, they generate their own at [id.atlassian.com](https://id.atlassian.com/manage-profile/security/api-tokens). Tokens are personal.

After init, `JIRA_API_TOKEN=...` in their shell rc and they're ready. First ticket:

### First-time bootstrap (only the very first developer to adopt nova-spec)

When you add nova-spec to an existing repo, `context/` starts empty. The
team can either populate it ticket-by-ticket (slow payoff) or run
[`/nova-seed`](flow/nova-seed.md) once to bootstrap it from the existing
codebase. The seeded files (`stack.md`, `conventions.md`,
`services/<svc>.md`) get committed to the repo, so every subsequent
teammate inherits the populated context — they don't need to re-run
`/nova-seed`.

Subsequent developers just clone, run `init`, and start working with
the architectural memory already in place.

```text
/nova-start <TICKET>
```

## The "edit and commit" loop

Workflow when you change a framework file:

```text
1. $EDITOR novaspec/templates/pr-body.md       # add your team's QA checklist
2. (optionally) test it: /nova-wrap on a real ticket
3. git add novaspec/templates/pr-body.md
4. git commit -m "chore(framework): add QA checklist to PR template"
5. push, merge, teammates pull
```

That's it. No special "deploy customization" step. The framework file is a regular source file.

For larger changes (adding a guardrail, modifying `nova-wrap.md`'s flow), follow your team's PR review process — it's a code change like any other.

## When two developers edit the same template

Standard merge conflict. Resolve in git, commit, push.

There's no special "framework merge" — these are just markdown files. If both of you added a checklist item to `pr-body.md`, both items end up in the merged version.

## Staying on the same version

The auto-sync hook runs `npx nova-spec@latest sync` on every Claude Code / OpenCode session start. So:

* Dev A publishes `1.0.4` to npm at 09:00
* Dev B opens Claude Code at 09:30 → hook upgrades them silently
* Dev C opens Claude Code at 14:00 → also upgraded
* No coordination needed

The sync respects each developer's local edits via hash-compare. If Dev B edited `pr-body.md` last week and `1.0.4` ships a new `pr-body.md`, Dev B's version is preserved with a `⚠ NOT updated` warning in their next sync.

## Reviewing framework changes

Treat changes under `novaspec/` like any other code review. Things to look for:

* **Templates** — does the new section make sense? Will the agent fill it correctly?
* **Commands (`/nova-*`)** — is the new step deterministic enough? Could it produce inconsistent output?
* **Guardrails** — does the bash script exit non-zero on failure? Are the regexes anchored where they should be?
* **Skills / agents** — does the prompt change introduce ambiguity?

A typical PR description for a framework change:

```markdown
## What
Add `## QA` section to pr-body.md and update nova-wrap to fill it from tasks.md

## Why
QA team asked us to enumerate browsers tested in every PR

## Test
- Ran /nova-wrap on PROJ-99 — section was filled correctly
- Confirmed sync skips this file going forward (verified via npx nova-spec sync output)
```

## The shared memory: decisions, gotchas, services

These three directories are the most valuable part of nova-spec for a team. They survive:

* The original author leaving the team
* The IDE being replaced
* AI tools changing
* Documentation rotting

Conventions for editing them:

* **Decisions** — write them when there's a real alternative and trade-off. `/nova-wrap` prompts; you can also write them by hand. Always include `> Supersedes: <old>.md` when replacing one. PR review checks the supersede ref points at an archived file.
* **Gotchas** — capture in the moment. If you wasted 3 hours on a non-obvious thing, write a gotcha file before the next ticket. Future-you (and teammates) will thank present-you.
* **Services** — kept ≤80 lines, replaced not appended, by `update-service-context` during `/nova-wrap`. If a service grows beyond 80 lines, split it into two service files (`auth-api-routes.md`, `auth-api-middleware.md`).

Treat these directories like load-bearing prose. Bad memory is worse than no memory.

## Branch hygiene

The framework expects:

* One branch per ticket (`<type>/<TICKET>-<slug>`)
* Branches cut from `branch.base` (default `main`)
* Working tree clean before `/nova-start`
* No long-lived ticket branches — close them via `/nova-wrap` and merge

If your team uses a different branching model (long-lived `develop`, environment branches), adjust:

* `branch.base` in `config.yml` for the cut-from branch
* `branch.types` to match your prefixes (e.g. `release/`, `epic/`)
* `nova-start.md` step 4 if your branching is more complex than a single base

## What does NOT need coordination

* **Updating nova-spec** — auto-sync handles it
* **Picking transition IDs** — each dev has their own Jira token, but the workflow is shared (in `config.yml`)
* **Choosing a forge** — auto-detected from `git remote`, same for everyone

## What DOES need coordination

* **Customizing a template that affects everyone** — yes, that's a regular team decision via PR
* **Changing `branch.types` or `branch.base`** — affects everyone's branches; communicate before merging
* **Adding a new guardrail** — could block someone mid-flow; ship in a quiet hour or PR-review carefully
* **Forking the npm package** (e.g. `@your-org/nova-spec`) — only if your team needs deviations the upstream won't accept

## Personal preferences vs team rules

Some things you might want personally that the team doesn't:

| Thing | Where | Personal or team? |
|---|---|---|
| Jira email and token | env + `config.yml` | Personal (different per dev) |
| Project key | `config.yml` → `jira.project` | Team (shared workflow) |
| Forge type | `config.yml` → `forge.type: auto` | Team (auto-detected) |
| Forge CLI override | `config.yml` → `forge.cli` | Personal usually (but if team mandates, share) |
| Branch base | `config.yml` → `branch.base` | Team |
| QA checklist in PR | `templates/pr-body.md` | Team |
| Personal todo notes | `notes.md` | Personal (gitignored) |

If you want a personal override of a team-shared file: don't. Either propose the change to the team via PR, or fork your own copy of nova-spec for that personal flavor. Mixed personal-team customizations get confusing fast.

## Lifecycle of a team adopting nova-spec

A realistic adoption arc:

1. **Week 1**: install, run a few tickets, get a feel for the flow.
2. **Week 2**: notice the default templates don't match your conventions. Edit `pr-body.md`, `commit.md`, `review.md`.
3. **Week 3**: write your first `context/decisions/` files. Notice they're useful in the next ticket.
4. **Week 4**: a teammate is onboarded; their first ticket runs your customized flow without explanation.
5. **Month 2**: the team has 10+ decisions, 5+ gotchas, services for every major component. New tickets reference them automatically.
6. **Month 6**: a senior leaves. The next person picks up their ticket using the spec, decisions, and gotchas files. No tribal knowledge lost.

That last point is the actual ROI. Everything else is just plumbing to get there.
