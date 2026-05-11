#!/usr/bin/env bash
# Guardrail: verify nova-spec is properly installed in this project.
#
# Usage: bash novaspec/guardrails/nova-installed.sh
# Exits 0 if installed, 1 if not.

set -euo pipefail

ok=1

if [ ! -f "novaspec/config.yml" ]; then
  echo "✗ novaspec/config.yml not found — run: npx nova-spec init" >&2
  ok=0
fi

if [ ! -d "context/" ]; then
  echo "✗ context/ directory missing — run: npx nova-spec init" >&2
  ok=0
fi

[ "$ok" -eq 1 ]
