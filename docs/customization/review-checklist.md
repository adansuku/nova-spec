---
description: Customize the structure /nova-review follows when writing review.md.
---

# Review checklist

The structure that `/nova-review` follows when writing `review.md` lives in:

```text
novaspec/templates/review.md
```

This is the **shape** of the review, not the criteria. Criteria are in the agent prompt (`novaspec/agents/nova-review-agent.md`) and the deterministic checks (`novaspec/guardrails/review-checks.sh`).

## What ships by default

```markdown
# Review: <TICKET-ID>

## Spec compliance
- [✓/✗] <criterion>: <detail>

## Conventions
- <findings or "no issues">

## Decisions
- <conflicts or "no conflicts">

## Risks
- <risks or "none">

## Blockers
- <must be resolved before /nova-wrap>

## Suggestions
- <optional improvements>

## Verdict
✓ Ready for /nova-wrap
```

The literal line `✓ Ready for /nova-wrap` (or `✗ Needs fixes`) is what guardrail #5 (`review-approved`) greps for. **Don't rename or remove it** — it's the deterministic gate.

## Common changes

### Add a domain-specific axis

If your team always reviews accessibility, security, or performance, add a section:

```markdown
## Accessibility
- [ ] Keyboard navigation works
- [ ] Screen-reader labels on interactive elements
- [ ] Color contrast meets WCAG AA
```

Then update `novaspec/agents/nova-review-agent.md` step 2 to evaluate that axis as well — otherwise the agent won't know to fill it.

### Make the verdict more granular

Instead of just `✓` or `✗`, you might want intermediate states:

```markdown
## Verdict
- ✓ Ready for /nova-wrap         ← no issues
- 🟡 Ready with minor changes    ← suggestions only, no blockers
- ✗ Needs fixes                  ← blockers present
```

Update guardrail #5 if you change the strings — the grep pattern is in `novaspec/guardrails/checklist.md` (`## 5. review-approved`).

### Drop sections you don't use

If your team doesn't track decisions, delete `## Decisions`. The agent will skip filling it.

### Require evidence for verdicts

```markdown
## Spec compliance
- [✓/✗] <criterion>: <detail>
- Evidence: <file:line> or "spec section X"
```

This nudges the agent to cite specific places in the diff instead of giving vague verdicts.

## How `/nova-review` uses the template

1. Locates artifacts (proposal.md, tasks.md, decisions, diff)
2. Runs `review-checks.sh` (deterministic) — if non-zero, verdict is `✗` immediately
3. Runs the 4-axis LLM review (Spec compliance, Conventions, Decisions, Risks)
4. Writes the result to `context/changes/active/<TICKET>/review.md` **using your customized template as the structure**

## Customizing the deterministic checks too

Often the right place for "always-true" rules is `review-checks.sh`, not the LLM. Examples:

* **No `console.log` in `src/`**
  ```bash
  if grep -rn "console\.log" src/ 2>/dev/null; then
    echo "✗ console.log found in src/"
    fail=1
  fi
  ```

* **All migrations have a corresponding rollback**
  ```bash
  for up in db/migrate/*.up.sql; do
    down="${up%.up.sql}.down.sql"
    [ -f "$down" ] || { echo "✗ Missing rollback: $down"; fail=1; }
  done
  ```

The script is plain bash. Add sections, exit non-zero on violation, the review fails fast before the LLM ever runs. See [Reference → Guardrails](../reference/guardrails.md).

## What NOT to break

* The literal verdict line — guardrail #5 depends on it.
* The file existing — `/nova-review` errors out if `novaspec/templates/review.md` is missing.
