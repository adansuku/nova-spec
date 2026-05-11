---
description: Closes open decisions and writes the spec — proposal.md.
---

# /nova-spec

Turns a vague ticket into a closed requirement with explicit decisions and a written `proposal.md`.

```text
/nova-spec
```

`quick-fix` tickets skip this step.

## What it does

1. Invokes the [`close-requirement` skill](#the-close-requirement-skill). The skill reads relevant context (services, decisions, gotchas) and asks **structured questions** until every ambiguous dimension has a closed answer. It does **not** advance until you confirm the decisions are closed.
2. Writes `context/changes/active/<TICKET>/proposal.md` using `novaspec/templates/proposal.md` as the structure.
3. **Stops at a human checkpoint**: shows you the spec and tells you to review before `/nova-plan`.

## Guardrails

| # | Check |
|---|---|
| 1 | Branch matches `branch.pattern` |

## The `close-requirement` skill

It forces decisions on six mandatory dimensions:

| Dimension | What you have to nail down |
|---|---|
| Shape of the solution | Approach in one sentence |
| Expected output | What does success look like to a caller? |
| Behavior | Normal, edge, failure cases |
| Actor and context | Who triggers it, in what state |
| Scope | What's in, what's out |
| Success criteria | Observable signal that it works |

Tone is conversational, ≤3 questions per turn, prefers trade-off questions (A vs B) over open-ended ones, and includes a default anchored in the codebase. It refuses to draft the spec while any decision is open.

## What it produces

| Artifact | Where |
|---|---|
| `proposal.md` | `context/changes/active/<TICKET>/proposal.md` |

The file follows `novaspec/templates/proposal.md`. Sections include: closed decisions, success criteria, scope (in/out), affected services, risks.

## Next step

```text
/nova-plan
```

But review `proposal.md` first. The next command will refuse to advance if it contains `TBD`, `TODO`, `FIXME`, `???`, `<placeholder>`, or `[ ] decision` — the [`proposal-closed` guardrail](../reference/guardrails.md) checks this deterministically.

## Errors you may see

| Error | Why | Fix |
|---|---|---|
| Skill keeps asking questions | Some dimension is still open | Answer concretely; pick a default if torn |
| Proposal written but full of `TBD` | The skill drafted before closing | Re-run `/nova-spec` and answer fully |
| `Branch pattern doesn't match` | You ran `/nova-spec` outside a ticket branch | Run `/nova-start <TICKET>` first |

## Customizing it

* The structure of `proposal.md` → edit `novaspec/templates/proposal.md`.
* The close-requirement questions → edit `novaspec/skills/close-requirement/SKILL.md` (e.g. add a 7th dimension specific to your domain).
* Add forbidden patterns to the proposal-closed check → edit `novaspec/guardrails/proposal-closed.sh` (e.g. require a `## Risks` section).
