---
description: Every guardrail nova-spec enforces, deterministic by design.
---

# Guardrails

Guardrails are **deterministic preconditions** — bash scripts and file-existence checks that exit non-zero to block a command. They are **not** LLM-judgment-based. If a check needs reasoning to evaluate, it's a suggestion, not a guardrail.

The full list lives in `novaspec/guardrails/checklist.md`. Execution order is **0 → 1 → 2 → 7 → 3 → 4 → 5 → 6**.

## The 8 guardrails

### 0. nova-installed
**Script**: `novaspec/guardrails/nova-installed.sh`
**Checks**: `novaspec/config.yml` exists and `context/` directory exists.
**Blocks**: every command that requires nova-spec to be installed.
**Fix**: `npx nova-spec init`.

### 1. branch-pattern
**Checks**: current git branch matches `<type>/<TICKET>-<slug>` where `<type>` is one of the values in `config.yml` → `branch.types`.
**Blocks**: every flow command except `/nova-start` and `/nova-status`.
**Fix**: run `/nova-start <TICKET>` first.

If `ticket_system: none`, the `<TICKET>` part can be any identifier.

### 2. proposal-exists
**Checks**: `context/changes/active/<ticket-id>/proposal.md` exists.
**Blocks**: `/nova-plan`, `/nova-build` (non-quick-fix), `/nova-review`, `/nova-wrap`.
**Fix**: run `/nova-spec` first.

### 3. tasks-exist
**Checks**: `context/changes/active/<ticket-id>/tasks.md` exists, **with a quick-fix exception**: tickets on `fix/` branches can proceed without a tasks file.
**Blocks**: `/nova-build` (non-quick-fix), `/nova-review` (non-quick-fix), `/nova-wrap` (non-quick-fix).
**Fix**: run `/nova-plan` first.

### 4. all-tasks-done
**Checks**: if `tasks.md` exists, it has no remaining `- [ ]` lines.
**Blocks**: `/nova-review`, `/nova-wrap`.
**Fix**: run `/nova-build` until all tasks are checked.

### 5. review-approved
**Checks**: `context/changes/active/<ticket-id>/review.md` contains the literal string `✓ Ready for /nova-wrap`.
**Blocks**: `/nova-wrap`.
**Fix**: run `/nova-review` until verdict is `✓`.

### 6. old-decision-archived
**Checks**: every `context/decisions/*.md` containing `> Supersedes: <X>.md` implies `<X>.md` lives in `context/decisions/archived/`, not at root.
**Blocks**: `/nova-wrap`.
**Fix**: `git mv context/decisions/<X>.md context/decisions/archived/<X>.md`.

### 7. proposal-closed
**Script**: `novaspec/guardrails/proposal-closed.sh`
**Checks**: `proposal.md` contains none of: `TBD`, `TODO`, `FIXME`, `???`, `<placeholder>`, `[ ] decision`.
**Blocks**: `/nova-plan`.
**Fix**: re-run `/nova-spec` and close the open requirements.

## The bash scripts

Three guardrails are bash scripts (deterministic by construction):

### `nova-installed.sh`

```bash
bash novaspec/guardrails/nova-installed.sh
# Exit 0 — installed
# Exit 1 — config.yml or context/ missing
```

### `proposal-closed.sh`

```bash
bash novaspec/guardrails/proposal-closed.sh <ticket-id>
# Exit 0 — proposal is closed
# Exit 1 — found unresolved markers (prints the lines)
# Exit 2 — proposal.md not found
```

Markers it greps for: `TBD`, `TODO`, `FIXME`, `???`, `<placeholder>`, `[ ] decision`. Add or remove patterns by editing the script.

### `review-checks.sh`

```bash
bash novaspec/guardrails/review-checks.sh <ticket-id> [base-branch]
# Exit 0 — every applicable check passes
# Exit 1 — at least one blocking check failed
# Exit 2 — usage error
```

Runs in order:

1. **Diff non-empty** — `git diff <base>...HEAD` and `git diff HEAD` not both empty
2. **Files-to-touch present** — every path under `## Files to touch` in `tasks.md` shows up in the diff
3. **Lint clean** — `npm/pnpm/yarn run lint` exits 0 (skipped if no `lint` script)
4. **Tests pass** — `npm/pnpm/yarn test` exits 0 (skipped if no `test` script)

Skipped checks don't fail; they print `ℹ︎` and continue.

This script is invoked by `nova-review-agent` **before** the LLM review. If it fails, the verdict is `✗ Needs fixes` immediately and the LLM review is skipped.

## Customizing guardrails

The bash scripts are plain bash. Add sections, exit non-zero on violation:

```bash
# In review-checks.sh — block console.log in src/
if grep -rn "console\.log" src/ 2>/dev/null; then
  echo "✗ console.log found in src/"
  fail=1
fi
```

For checklist-based guardrails (1, 2, 3, 4, 5, 6) the rule lives in `novaspec/guardrails/checklist.md` as instructions the agent follows. To add a new one:

1. Add `## 8. your-new-check` section to `checklist.md`
2. (If deterministic) write `your-new-check.sh`
3. Update the execution order line at the top
4. Reference it in any command's `## Guardrail` section that should respect it

## What guardrails are NOT

* They are not for **quality**. "The code is well-structured" is not a guardrail — it requires judgment.
* They are not LLM prompts disguised as checks. If the test is "does the model think this is OK", it's not a guardrail.
* They are not blockers you can't override. The developer can always escape — touch the file the guardrail expects, mark a task done by hand, etc. See [PHILOSOPHY.md](https://github.com/Adansuku/nova-spec/blob/main/PHILOSOPHY.md) principle 5.

## Where they're invoked

| Guardrail | Command(s) |
|---|---|
| 0 | All flow commands (any agent that calls `nova-installed.sh`) |
| 1 | `/nova-spec`, `/nova-plan`, `/nova-build`, `/nova-review`, `/nova-wrap` |
| 2 | `/nova-plan`, `/nova-build` (non-quick-fix), `/nova-review`, `/nova-wrap` |
| 3 | `/nova-build`, `/nova-review`, `/nova-wrap` (non-quick-fix) |
| 4 | `/nova-review`, `/nova-wrap` |
| 5 | `/nova-wrap` |
| 6 | `/nova-wrap` |
| 7 | `/nova-plan` |

Plus `review-checks.sh` is invoked by `nova-review-agent` before the LLM review.
