# Guardrails — Checklist

**Execution order: 1 → 2 → 7 → 3 → 4 → 5 → 6**

## 1. branch-pattern
Verify the active ticket branch. Extract `<ticket-id>` from the current git branch.
- Read `branch.types` from `novaspec/config.yml` to know which prefixes are
  valid for this project. The defaults shipped by the installer are:
  `feature, fix, arch, bugfix, hotfix, docs, refactor, chore`.
- The branch must follow `<type>/<TICKET>-<slug>` where `<type>` is any of
  the configured types (matched against the **values** in `branch.types`,
  e.g. `documentation: docs` → `docs` is valid).
- If `ticket_system: none` in config, the `<TICKET>` part can be any
  identifier the user chose (no enforced format).
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
Validate that superseded decisions are archived.
- Files in `context/decisions/*.md` with `> Supersedes: X.md` imply that `X.md` lives in `context/decisions/archived/`, not at the root.
- ⛔ **Stop.** Move the file to `archived/` with `git mv` and retry.

## 7. proposal-closed
Deterministic check: the proposal has no unresolved markers.
- Run `bash novaspec/guardrails/proposal-closed.sh <ticket-id>`.
- The script greps for `TBD`, `TODO`, `FIXME`, `???`, `<placeholder>`, `[ ] decision`.
- ⛔ **Stop.** Re-run `/nova-spec` and close the open requirements before `/nova-plan`.
