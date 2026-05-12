---
description: Apply review changes after /nova-wrap — fetch PR feedback, execute fixes, commit + push (no new PR, no Jira change)
argument-hint: [optional: paste reviewer comments here]
---

You handle **second-round** (and further) changes after `/nova-wrap` was
already run. The PR is open, the Jira ticket is in "Code Review", and a
reviewer has asked for changes.

The user can invoke this two ways:

1. **`/nova-rework`** (no arguments) — auto-fetch comments from the PR
2. **`/nova-rework <feedback text>`** — user-supplied feedback. Skip the
   fetch and use `$ARGUMENTS` as the source of changes.

## When to use this

- Reviewer left comments on the PR asking for concrete changes.
- `/nova-wrap` is already done (PR exists; ticket is in "Code Review").
- You want to address the feedback as a coherent, traceable round.

## When NOT to use this

- The change is trivial (a typo) — just edit, commit, push manually.
- The PR hasn't been opened yet — use `/nova-build` and `/nova-wrap` first.
- The reviewer's feedback contradicts the spec — stop, update the spec
  first via `/nova-spec`, then resume.

## Guardrail

`checklist.md` → 0, 1 (nova-installed, branch-pattern).

Additionally: there must be a PR open on the current branch. If not,
abort and tell the user `/nova-wrap` first.

## Steps

### 1. Get the feedback

**If `$ARGUMENTS` is non-empty**, treat its content as the review
feedback. Skip the rest of this step and go to step 2.

**If `$ARGUMENTS` is empty**, fetch from the PR:

```bash
# GitHub:
gh pr view --json url,number,reviews,comments

# GitLab:
glab mr view --output json
```

If neither CLI is configured / the call fails, ask the user to **paste**
the review feedback they want addressed.

### 2. Detect the round number

Read `context/changes/active/<ticket-id>/tasks.md`. Count existing
`## Review fixes (round N)` sections. The new round is `N+1` (so the
first round of fixes is "round 1").

If `tasks.md` doesn't exist (quick-fix ticket), create one with just the
new section — you don't need a full plan for review fixes.

### 3. Translate feedback into tasks

For each reviewer comment that requests a **concrete change**, append a
checkbox to a new `## Review fixes (round N)` section. Skip:
- LGTM / approval comments
- Questions you can answer in a reply, no code change needed
- Nits the user explicitly tells you to ignore

Format each task:

```markdown
## Review fixes (round 2)

- [ ] @<reviewer>: <one-line summary of the change> → <affected file or area>
- [ ] @<reviewer>: <another change>
```

Show the user the generated tasks. **Wait for explicit confirmation**
before executing. If the user wants to drop or merge some, do so.

### 4. Execute (same model as /nova-build)

For each unchecked task:

1. Read the relevant files.
2. Apply the change.
3. Run the incremental self-check:
   - Does it address the reviewer's intent?
   - Does it avoid breaking the spec or other tests?
   - Is it consistent with `context/conventions.md`?
4. Mark `- [ ]` → `- [x]` (or `- [!]` with a note if it fails — same
   convention as `/nova-build`).

Stop only on a real blocker.

### 5. Run the deterministic checks again

```bash
bash novaspec/guardrails/review-checks.sh <ticket-id> <base-branch>
```

This re-runs lint + tests + "files-to-touch present" on the **current**
diff (including the fixes you just applied). If it fails, **stop and
fix** before committing.

### 6. Commit

Use `novaspec/templates/commit.md` as a guide. **One commit per round**
keeps history clean. Suggested subject pattern:

```text
review(<scope>): address round <N> feedback from @<reviewer>
```

If multiple reviewers commented, group by intent rather than by author.
A single commit is fine; multiple commits if the changes are unrelated.

### 7. Push to the existing branch

```bash
git push
```

**Don't create a new PR.** The existing PR updates automatically when
you push to its branch. The reviewer gets a notification.

### 8. Don't touch Jira

The ticket stays in **"Code Review"**. nova-spec does not move it. When
the reviewer approves and the PR is merged, Jira's native forge
integration handles the transition to Done.

### 9. Final summary

```text
## Round <N> applied

- Comments addressed: <count>
- Files touched: <list>
- Deterministic checks: ✓
- Commit: <hash> <subject>
- Pushed to: <branch>
- PR: <link>  (waiting for re-review)
```

## Rules

- **One round = one commit** (or one cluster of related commits). Don't
  squeeze 4 rounds of feedback into 1 commit — history matters when the
  reviewer is comparing diff-by-diff.
- **Never re-run `/nova-wrap`** — the PR already exists and the memory
  step (decisions / gotchas / services) was already done.
- **If a comment requires a new architectural decision**, document it in
  `context/decisions/` before doing the implementation task. Reference
  the decision file in the task line.
- **If a comment contradicts the spec**, stop. Open `proposal.md` and
  update it (or via `/nova-spec` if there's a real decision to close).
  Then resume.
- **`tasks.md` becomes the audit trail** of the whole review cycle. By
  the end, `## Review fixes (round 1)`, `## Review fixes (round 2)`,
  etc., document every change requested and how it was addressed.
