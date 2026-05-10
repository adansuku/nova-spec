#!/usr/bin/env bash
# Guardrail: deterministic pre-review checks.
#
# Usage: bash novaspec/guardrails/review-checks.sh <ticket-id> [base-branch]
#
# Runs (in order):
#   1. diff is non-empty (committed + working tree)
#   2. every "Files to touch" entry from tasks.md appears in the diff
#   3. lint clean (if `npm run lint` / `pnpm lint` / `yarn lint` exists)
#   4. tests pass (if `npm test` / `pnpm test` / `yarn test` exists)
#
# Exits 0 if every applicable check passes, 1 if any blocking check fails,
# 2 on usage error. Skipped checks (e.g. no lint script) are reported but
# don't fail.

set -uo pipefail

if [ -z "${1:-}" ]; then
  echo "Usage: $0 <ticket-id> [base-branch]" >&2
  exit 2
fi

ticket="$1"
base="${2:-main}"
fail=0

# 1. Diff non-empty
diff_total="$(git diff "$base"...HEAD 2>/dev/null; git diff HEAD 2>/dev/null)"
if [ -z "$diff_total" ]; then
  echo "✗ Empty diff: no committed or staged changes against $base."
  fail=1
else
  echo "✓ Diff is non-empty."
fi

# 2. Files to touch
tasks="context/changes/active/${ticket}/tasks.md"
if [ -f "$tasks" ]; then
  # Pull every path under a "Files to touch" section. We look for lines that
  # look like list items containing a path-ish token, but only between that
  # heading and the next heading.
  declared="$(awk '
    /^#+ +Files to touch/i, /^#+ +/ {
      if (NR > 1 && /^#+ +/ && !/^#+ +Files to touch/i) next_section=1
      if (next_section) next
      if (match($0, /[`"]?([\.a-zA-Z0-9_\/-]+\.[a-zA-Z0-9]+)[`"]?/, m)) print m[1]
    }
  ' "$tasks" | sort -u)"

  if [ -n "$declared" ]; then
    missing=""
    while IFS= read -r f; do
      [ -z "$f" ] && continue
      if ! git diff "$base"...HEAD --name-only | grep -qxF "$f" \
         && ! git diff HEAD --name-only | grep -qxF "$f"; then
        missing+="   - $f"$'\n'
      fi
    done <<< "$declared"

    if [ -n "$missing" ]; then
      echo "✗ Files declared in tasks.md but missing from diff:"
      printf '%s' "$missing"
      fail=1
    else
      echo "✓ All declared files present in diff."
    fi
  else
    echo "ℹ︎ tasks.md has no 'Files to touch' section — skipping declared-files check."
  fi
else
  echo "ℹ︎ No tasks.md (quick-fix path) — skipping declared-files check."
fi

# 3 + 4. Lint and test
detect_pm() {
  if [ -f pnpm-lock.yaml ]; then echo pnpm
  elif [ -f yarn.lock ]; then echo yarn
  elif [ -f package-lock.json ] || [ -f package.json ]; then echo npm
  else echo ''
  fi
}

has_script() {
  local pm="$1" script="$2"
  if [ ! -f package.json ]; then return 1; fi
  node -e "process.exit(((require('./package.json').scripts||{})['$script'])?0:1)" 2>/dev/null
}

pm="$(detect_pm)"

if [ -n "$pm" ] && has_script "$pm" lint; then
  echo "Running $pm run lint…"
  if "$pm" run lint --silent >/dev/null 2>&1; then
    echo "✓ Lint clean."
  else
    echo "✗ Lint failed. Run \`$pm run lint\` and fix before review."
    fail=1
  fi
else
  echo "ℹ︎ No lint script — skipping."
fi

if [ -n "$pm" ] && has_script "$pm" test; then
  echo "Running $pm test…"
  if "$pm" test --silent >/dev/null 2>&1; then
    echo "✓ Tests pass."
  else
    echo "✗ Tests failed. Run \`$pm test\` and fix before review."
    fail=1
  fi
else
  echo "ℹ︎ No test script — skipping."
fi

[ "$fail" -eq 0 ]
