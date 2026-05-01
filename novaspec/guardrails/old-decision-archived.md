# Guardrail: old-decision-archived

Validates that decisions marked as superseded are archived.

## What it checks

For each file in `context/decisions/*.md` (not in `archived/`) that contains a line matching `> Supersedes: <file>.md`:

- The referenced `<file>.md` **must NOT exist** in `context/decisions/` (root).
- The referenced `<file>.md` **must exist** in `context/decisions/archived/`.

If either condition fails, the guardrail fails.

## Verification command

```bash
failed=0
for f in context/decisions/*.md; do
  [ -f "$f" ] || continue
  while IFS= read -r old; do
    old=$(echo "$old" | sed -E 's/^> Supersedes:[[:space:]]*//')
    [ -z "$old" ] && continue
    if [ -f "context/decisions/$old" ]; then
      echo "⛔ Guardrail: $f references '$old' as superseded, but '$old' lives in context/decisions/ (must be in archived/)."
      failed=1
    fi
    if [ ! -f "context/decisions/archived/$old" ]; then
      echo "⛔ Guardrail: $f references '$old' as superseded, but '$old' is not in context/decisions/archived/."
      failed=1
    fi
  done < <(grep -E "^> Supersedes:" "$f")
done
exit $failed
```

## Error message

```
⛔ Guardrail: <new-file> references '<old-file>' as superseded,
but '<old-file>' lives in context/decisions/ (must be in archived/).
```

## Recovery

```bash
git mv context/decisions/<old-file>.md context/decisions/archived/<old-file>.md
```

Verify the new file still contains the line `> Supersedes: <old-file>.md`. Retry.

## When it runs

Referenced by `/nova-wrap` as a pre-step before the ticket commit.
