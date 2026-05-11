---
description: Final code review — deterministic checks first, then 4-axis LLM review in an isolated context.
---

# /nova-review

The last gate before `/nova-wrap`. Runs in an isolated context window via the `nova-review-agent` sub-agent so the review is independent of the building session's context.

```text
/nova-review
```

## What it does, in order

1. **Locates artifacts**: `proposal.md`, `tasks.md`, live decisions in `context/decisions/` (skipping `archived/`), and the diff against `branch.base`.
2. **Runs deterministic checks (BLOCKING)**: `bash novaspec/guardrails/review-checks.sh <ticket> <base>`. If it exits non-zero, the verdict is `✗ Needs fixes` immediately and the LLM review is skipped — there's no point grading code that already failed objective gates.
3. **Runs the 4-axis LLM review** (only if step 2 passed):
   - **Spec compliance** — does the diff implement what `proposal.md` said?
   - **Conventions** — style consistent with surrounding code, names follow repo convention, no dead code/prints/leftover imports.
   - **Decisions** — does the change contradict any live decision under `context/decisions/`? Unjustified violations are blockers.
   - **Risks** — unforeseen side effects, missing safety nets from `tasks.md`.
4. **Writes the report** to `context/changes/active/<TICKET>/review.md` using `novaspec/templates/review.md`.
5. **Returns one line** to the calling session: `Review complete. Verdict: <✓ Ready for /nova-wrap | ✗ Needs fixes: N blocker(s)>`.

## Guardrails

| # | Check |
|---|---|
| 1 | Branch matches `branch.pattern` |
| 2 | `proposal.md` exists |
| 3 | `tasks.md` exists (skipped for `quick-fix`) |
| 4 | All tasks done (`- [x]`) |

## What `review-checks.sh` actually does

| Check | What it verifies | Skipped if |
|---|---|---|
| Diff non-empty | `git diff <base>...HEAD` and `git diff HEAD` not both empty | — |
| Files-to-touch present | Every path under `## Files to touch` in `tasks.md` shows up in the diff | `tasks.md` has no such section, or quick-fix |
| Lint clean | `npm/pnpm/yarn run lint` exits 0 | No `lint` script in `package.json` |
| Tests pass | `npm/pnpm/yarn test` exits 0 | No `test` script in `package.json` |

Skipped checks don't fail — they're reported as `ℹ︎` and the review continues.

## What it produces

| Artifact | Where |
|---|---|
| `review.md` | `context/changes/active/<TICKET>/review.md` |

If verdict is `✓`, the file ends with the literal line `✓ Ready for /nova-wrap` — the [`review-approved` guardrail](../reference/guardrails.md) greps for that exact string.

## Next step

```text
/nova-wrap
```

If the verdict is `✗`, fix the blockers (or amend the spec if scope was wrong) and re-run `/nova-review`. The agent doesn't auto-fix — that's still your call.

## Errors you may see

| Error | Why | Fix |
|---|---|---|
| `✗ Empty diff` | No changes committed or staged against `base` | You forgot to commit, or `base` is wrong; check `branch.base` |
| `✗ Files declared in tasks.md but missing from diff` | Plan lists a file you never touched | Update `tasks.md` to remove it, or actually touch the file |
| `✗ Lint failed` | Style violations | Run `npm run lint` locally, fix, re-run review |
| `✗ Tests failed` | Test red on the branch | Fix the tests, re-run |
| LLM review verdict is `✗ Needs fixes` despite all deterministic checks passing | Spec compliance, conventions, decisions, or risks blockers | Read `review.md` for the specifics |

## Customizing it

* The review template structure → edit `novaspec/templates/review.md`.
* Add deterministic checks (e.g. "no `console.log` in `src/`") → add a section to `novaspec/guardrails/review-checks.sh`.
* Different lint/test commands → the script auto-detects the package manager. To force one, set it explicitly inside the script.
* The 4-axis review prompt → edit `novaspec/agents/nova-review-agent.md`. Add domain-specific axes (e.g. "Accessibility") if your team needs them.
