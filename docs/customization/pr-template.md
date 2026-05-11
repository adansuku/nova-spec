---
description: Customize the PR / MR description that /nova-wrap generates.
---

# PR / MR template

The body of every PR or MR opened by `/nova-wrap` comes from one file:

```text
novaspec/templates/pr-body.md
```

Edit it directly. Sync will preserve your changes via hash-compare.

## What ships by default

```markdown
## Ticket
<link to Jira>

## Summary
<what changes and why>

## Spec
context/changes/archive/<ticket-id>/proposal.md

## Decisions
- context/decisions/<file>.md (if applicable)

## Manual verification
<steps from tasks.md or the spec>

## Checklist
- [x] Spec archived
- [x] Services updated (if applicable)
- [x] Decision created (if applicable)
- [x] Review without blockers
```

The `<placeholder>` tokens are filled by `/nova-wrap` from the ticket, archived spec, and review report.

## Common changes

### Add a QA checklist

```markdown
## QA
- [ ] Tested on staging
- [ ] Screenshots attached for UI changes
- [ ] Browser support: Chrome, Safari, Firefox
- [ ] No new console errors
```

### Link directly to Jira with the right URL

Replace `<link to Jira>` with a literal-looking URL the agent fills in:

```markdown
## Ticket
https://your-workspace.atlassian.net/browse/<TICKET-ID>
```

### Add security / privacy review for sensitive areas

```markdown
## Security review (required if touching auth, payments, PII)
- [ ] No new secrets in logs
- [ ] PII fields encrypted at rest
- [ ] Threat-model section in spec
```

### Strip sections you don't use

If your team doesn't write decisions or doesn't track service changes, just delete those sections. The agent fills only what's present.

## What `/nova-wrap` substitutes

The agent fills these tokens when it composes the body:

| Placeholder in template | What gets substituted |
|---|---|
| `<TICKET-ID>` | The current ticket key (e.g. `PROJ-42`) |
| `<link to Jira>` | URL to the ticket if `ticket_system: jira` |
| `<ticket-id>` (lowercase) | Same key in lowercase, used in archive paths |
| `<file>.md` under Decisions | Names of decisions created during `/nova-wrap` |
| `<what changes and why>` | One-paragraph summary derived from the spec |
| `<steps from tasks.md or the spec>` | Manual verification steps |

These aren't strict templates — the agent reads them as instructions, fills them with real content. So writing `<your custom thing>` in a section will tell the agent to fill that placeholder semantically.

## What NOT to break

* **Don't remove the `## Ticket` heading** if `ticket_system: jira` — `/nova-wrap` expects to insert the link there.
* **Keep the file as a single markdown document.** Front-matter, code fences for the whole body, or other wrappers will confuse the agent.
* **Test it once after editing.** Run a real `/nova-wrap` and check the resulting PR body looks right before relying on it for the team.

## How sync handles your edits

Once you edit `pr-body.md`:

* `npx nova-spec sync` hashes the file and compares with the last-shipped hash.
* It differs → sync skips it, reports `⚠ NOT updated (you have local edits): novaspec/templates/pr-body.md`.
* Run `/nova-diff novaspec/templates/pr-body.md` to see what changed upstream and decide whether to merge.

See [Architecture → Sync internals](../architecture/sync-internals.md) for the full mechanism.
