# Guardrails — Checklist

**Execution order: 1 → 2 → 3 → 4 → 5 → 6**

## 1. branch-pattern
Verify the active ticket branch. Extract `<ticket-id>` from the current git branch.
- Must follow the pattern `(feature|fix|arch)/<TICKET>-<slug>` from `novaspec/config.yml`.
- ⛔ **Stop.** Run `/nova-start <TICKET>` first.

## 2. proposal-exists
Verify the spec is drafted.
- `context/changes/active/<ticket-id>/proposal.md` must exist.
- ⛔ **Stop.** Run `/nova-spec` first.

## 3. tasks-exist
Verify tasks. Quick-fix exception (`fix/` branch).
- If **not quick-fix**: `context/changes/active/<ticket-id>/tasks.md` must exist.
- If **quick-fix**: you can continue without `tasks.md`.
- ⛔ **Stop.** Run `/nova-plan` first.

## 4. all-tasks-done
Verify tasks completed. Quick-fix exception without `tasks.md`.
- If **tasks.md exists**: no `- [ ]` should remain.
- ⛔ **Stop.** Run `/nova-build` first.

## 5. review-approved
Verify the review was approved.
- `review.md` must exist with the line `✓ Ready for /nova-wrap`.
- ⛔ **Stop.** Run `/nova-review` first.

## 6. old-decision-archived
Validate that superseded decisions are archived. See `novaspec/guardrails/old-decision-archived.md`.
- Files in `context/decisions/*.md` with `> Supersedes: X.md` imply that `X.md` lives in `context/decisions/archived/`, not at the root.
- ⛔ **Stop.** Move the file to `archived/` with `git mv` and retry.
