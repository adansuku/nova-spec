---
description: Closes the ticket — updates architectural memory, archives the spec, commits, opens the PR/MR, and transitions Jira.
---

# /nova-wrap

The step that makes nova-spec **learn**. Without it, the system has no memory and the next ticket starts from zero.

```text
/nova-wrap
```

## What it does, in order

1. **Detects architectural decisions** — if a real choice was made with an alternative and trade-off, invokes the [`write-decision` skill](../architecture/memory-model.md). The skill creates `context/decisions/<concept>.md` and, if it supersedes an old decision, includes `> Supersedes: <old>.md` and runs `git mv context/decisions/<old>.md context/decisions/archived/<old>.md`.
2. **Updates services** — for each modified service whose **public interface** changed, invokes [`update-service-context`](../architecture/memory-model.md) to rewrite `context/services/<svc>.md` (≤80 lines, replace, never accumulate).
3. **Captures gotchas** — asks if anything counterintuitive emerged that another developer would rediscover. If yes, adds `context/gotchas/<concept>.md`. Default: don't write — most tickets don't generate a gotcha.
4. **Archives the spec** — moves `context/changes/active/<TICKET>/` → `context/changes/archive/<TICKET>/`.
5. **Commits** — uses `novaspec/templates/commit.md` as the format. Proposes splitting into logical commits if the change is large.
6. **Opens the PR / MR** — builds the command via the forge abstraction:
   ```bash
   npx nova-spec forge pr-command "<title>" "<body>" "<base>"
   ```
   This emits `gh pr create ...` for GitHub or `glab mr create ...` for GitLab depending on `forge.type` in `config.yml` (or auto-detection from `git remote`). Title format is `<TICKET-ID>: <title>`. Body uses `novaspec/templates/pr-body.md`.
7. **Closes the Jira ticket** — if `jira.skill` is set, transitions the ticket to "Done" using `jira.transitions.done` (or the legacy `jira.done_transition_id`).
8. **Prints the final summary** with all artifacts.

## Guardrails

| # | Check |
|---|---|
| 1 | Branch matches `branch.pattern` |
| 5 | `review.md` contains `✓ Ready for /nova-wrap` |
| 6 | Superseded decisions are archived (deterministic invariant) |

## The forge abstraction

`nova-wrap` never hardcodes `gh`. The CLI handles the differences:

| Forge | Command emitted |
|---|---|
| `github` | `gh pr create --base <base> --title <t> --body <b>` |
| `gitlab` | `glab mr create --target-branch <base> --title <t> --description <b> --yes` |

If the CLI is missing (`gh: command not found`), the command tells you how to install it and offers a manual `git push` + URL fallback.

GitHub vocabulary is "PR / Pull Request"; GitLab is "MR / Merge Request". `npx nova-spec forge term` returns `PR` or `MR` so user-facing messages match the forge.

See [Integrations → Forge](../integrations/forge.md) for the full setup.

## Memory updates

The three skills invoked here are described in [Architecture → Memory model](../architecture/memory-model.md). Quick summary:

| Skill | When | What it writes |
|---|---|---|
| `write-decision` | Real architectural choice with an alternative | `context/decisions/<concept>.md` |
| `update-service-context` | Service's public interface changed | Rewrites `context/services/<svc>.md` (≤80 lines) |
| (gotcha logic) | Something counterintuitive surfaced | `context/gotchas/<concept>.md` |

If you say "no" to all three prompts, `/nova-wrap` warns: *"we're closing without memory, are you sure?"* — answer yes if the change really had no architectural weight (most quick-fixes).

## What it produces

| Artifact | Where |
|---|---|
| New decisions | `context/decisions/<concept>.md` (and archived copies of superseded ones) |
| Updated services | `context/services/<svc>.md` |
| New gotchas | `context/gotchas/<concept>.md` |
| Archived spec | `context/changes/archive/<TICKET>/` |
| Commit(s) | On the ticket branch |
| PR / MR | On GitHub / GitLab |
| Jira ticket | Transitioned to "Done" |

## Final summary

```text
## Ticket PROJ-42 closed

- Spec archived: context/changes/archive/PROJ-42/
- Decisions created: throttling-strategy.md
- Gotchas added: redis-key-collision.md
- Services updated: auth-api
- Commits: 3
- PR: https://github.com/your/repo/pull/123
- Jira: PROJ-42 → Done ✓
```

## Errors you may see

| Error | Why | Fix |
|---|---|---|
| `✗ Review not approved` | `review.md` missing the `✓ Ready for /nova-wrap` line | Run `/nova-review` until verdict is `✓` |
| `gh: command not found` / `glab: command not found` | Forge CLI not installed | Install [`gh`](https://cli.github.com/) or [`glab`](https://gitlab.com/gitlab-org/cli); the command falls back to `git push` + URL |
| Jira returns 400 on transition | Wrong `transitions.on_pr` ID for your workflow | Run `npx nova-spec jira transitions PROJ-42` to list reachable transitions, update `config.yml` |
| Superseded decision still at root | Forgot the `git mv` to `archived/` | The guardrail blocks; move with `git mv` |

## Customizing it

* PR / MR body → edit `novaspec/templates/pr-body.md`.
* Commit format → edit `novaspec/templates/commit.md`.
* When to write a decision (e.g. require one for `architecture` tickets) → edit step 1 of `novaspec/commands/nova-wrap.md`.
* Different Jira "Code Review" transition → `config.yml` → `jira.transitions.on_pr`.
* Switch forge → `config.yml` → `forge.type` (`github` / `gitlab` / `auto` / `none`).

## After /nova-wrap — handling review feedback

When a reviewer requests changes on the open PR, do **not** re-run
`/nova-wrap`. Use [`/nova-rework`](nova-rework.md) instead — it fetches
the comments, generates tasks under `## Review fixes (round N)` in
`tasks.md`, executes them, and pushes a single commit per round. The PR
updates automatically; the Jira ticket stays in "Code Review".

When the reviewer approves and merges the PR, Jira moves the ticket to
Done automatically (via its native forge integration). The framework's
job ends at "PR is mergeable" — Done is owned by the forge integration,
not nova-spec.
