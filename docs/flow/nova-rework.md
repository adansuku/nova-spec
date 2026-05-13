---
description: Apply review changes after /nova-wrap — second (and later) rounds in the same PR.
---

# /nova-rework

After `/nova-wrap` you have a PR open and the Jira ticket sits in
**"Code Review"**. The reviewer reads your code and leaves comments
asking for changes. `/nova-rework` is the command that handles that
round of changes coherently — fetches feedback, generates tasks,
executes, commits, pushes. The PR updates automatically.

```text
/nova-rework
```

## What it solves

`/nova-build` is for the **initial implementation** based on `tasks.md`.
After `/nova-wrap` runs, `tasks.md` has every task marked `[x]`, so
`/nova-build` says "all done, run `/nova-review`" — which isn't what you
need after a reviewer asks for changes.

You **could** edit `tasks.md` by hand and run `/nova-build` again, but
that's fragile and easy to mishandle. `/nova-rework`:

- Fetches PR comments via `gh` or `glab` (or accepts paste)
- Translates each actionable comment into a task in a new `## Review fixes (round N)` section
- Executes the new tasks with the same self-check discipline as `/nova-build`
- Re-runs deterministic checks (`review-checks.sh`)
- Commits with a `review:` subject and pushes — **no new PR**

## What it doesn't do

- **Doesn't move the Jira ticket.** Stays in "Code Review". Jira moves it to Done when the PR merges, via its native forge integration.
- **Doesn't create a new PR.** Push to the existing branch updates the open PR automatically.
- **Doesn't re-run `/nova-wrap`.** The memory step (decisions / services / gotchas) was already done.

## Typical session

```text
> /nova-rework

[fetches gh pr view --comments]
[generates 3 tasks under "## Review fixes (round 1)"]

Show user:
  ## Review fixes (round 1)
  - [ ] @alice: use Result<T,E> instead of throwing in validateUser → src/auth/validate.ts
  - [ ] @alice: add test for empty-email edge case → src/auth/validate.test.ts
  - [ ] @bob: rename `auth` constant to `authMiddleware` → src/auth/index.ts

Proceed? (y/n)

[executes tasks, marks [x] one by one]
[runs review-checks.sh — passes]

Commit message:
  review(auth): address round 1 feedback from @alice, @bob

[pushes to existing branch]

## Round 1 applied
- Comments addressed: 3
- Files touched: src/auth/validate.ts, src/auth/validate.test.ts, src/auth/index.ts
- Deterministic checks: ✓
- Commit: abc1234 review(auth): address round 1 feedback from @alice, @bob
- Pushed to: feature/PROJ-42-validate-auth
- PR: https://github.com/your/repo/pull/123 (waiting for re-review)
```

## Multiple rounds

Each invocation creates a new section:

```markdown
## Review fixes (round 1)
- [x] @alice: use Result<T,E> instead of throwing
- [x] @alice: add test for empty email
- [x] @bob: rename auth constant

## Review fixes (round 2)
- [x] @alice: nit — extract magic number 30s to a named constant
- [x] @bob: ah I see, ignore my round-1 comment about the name — undo it
```

`tasks.md` is the **audit trail of the whole review cycle**. Anyone
reading it later can reconstruct the back-and-forth without digging
through PR comments.

## When something in feedback isn't a code change

| Feedback type | What to do |
|---|---|
| "LGTM" / approval | Nothing. `/nova-rework` doesn't create tasks for approvals. |
| Question you can answer in a reply | Reply on the PR. No task needed. |
| Nit you choose to skip | Tell `/nova-rework` to drop that task when it shows you the list. |
| Suggestion that contradicts the spec | **Stop.** Update `proposal.md` (or re-run `/nova-spec`) first. |
| Suggestion that requires a new architectural decision | Stop. Write the decision in `context/decisions/<concept>.md` first. Then resume. |

## When the reviewer is satisfied

You don't do anything special. When they approve and merge the PR:

1. GitHub / GitLab notifies Jira (standard integration)
2. Jira moves the ticket to Done
3. The merge commit lands on `main` (or your `branch.base`)
4. **You're done with the ticket.**

If your workspace doesn't have the Jira ↔ forge integration set up, the
ticket stays in "Code Review" until someone moves it manually. That's
fine — the framework's job ended at "PR is mergeable".

## Errors you may see

| Error | Cause | Fix |
|---|---|---|
| `No PR found on current branch` | `/nova-wrap` wasn't run, or branch isn't pushed | Run `/nova-wrap` first |
| `gh: command not found` | GitHub CLI missing | Install `gh` or paste the review comments manually |
| `Deterministic checks failed` (lint/tests) | The fix broke something | Read the script output, address, retry |
| `tasks.md not found` | Quick-fix ticket without `tasks.md` | `/nova-rework` creates one with just the review-fixes section |

## Companion commands

- [`/nova-wrap`](nova-wrap.md) — produces the PR that this command reworks
- [`/nova-build`](nova-build.md) — initial implementation. Don't reuse for review fixes.
- [`/nova-review`](nova-review.md) — local pre-PR review, before `/nova-wrap`. Distinct from human PR review.
