#!/usr/bin/env bash
# Guardrail: verify the proposal has no open requirements.
#
# Usage: bash novaspec/guardrails/proposal-closed.sh <ticket-id>
# Exits 0 if proposal is closed, 1 if it has open markers, 2 if missing.

set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Usage: $0 <ticket-id>" >&2
  exit 2
fi

ticket="$1"
proposal="context/changes/active/${ticket}/proposal.md"

if [ ! -f "$proposal" ]; then
  echo "✗ Proposal not found: $proposal" >&2
  exit 2
fi

# Patterns that indicate unresolved questions or placeholders.
# Word-boundary checks avoid matching e.g. "TODOS" inside a real word.
patterns=(
  '\bTBD\b'
  '\bTODO\b'
  '\bFIXME\b'
  '\?\?\?'
  '<placeholder>'
  '\[ \] decision'
)

found=0
for pat in "${patterns[@]}"; do
  if grep -nE "$pat" "$proposal" >/dev/null 2>&1; then
    if [ $found -eq 0 ]; then
      echo "✗ Proposal has open markers — close them before /nova-plan:"
      found=1
    fi
    grep -nE "$pat" "$proposal" | sed 's/^/   /'
  fi
done

if [ $found -eq 1 ]; then
  exit 1
fi

echo "✓ Proposal is closed."
exit 0
