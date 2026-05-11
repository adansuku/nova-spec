---
layout: home

hero:
  name: nova-spec
  text: Spec-Driven Development for Claude Code
  tagline: From a ticket to a merged PR in explicit steps, with architectural memory that doesn't decay.
  actions:
    - theme: brand
      text: Get started
      link: /getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/Adansuku/nova-spec

features:
  - title: Disciplined ticket → PR flow
    details: Nine /nova-* slash commands enforce sequence, file structure, and naming. Skip a step and the next one stops you.
  - title: Atomic markdown memory
    details: Decisions, gotchas, and services in one-fact-per-file markdown. No DSL, no daemon, no database.
  - title: Jira-first, multi-forge
    details: Native Jira integration as a skill. Auto-detects GitHub (gh) and GitLab (glab) from your git remote.
  - title: Auto-sync that doesn't clobber
    details: Hash-compares every framework file on every Claude Code session start. Your local edits are always preserved.
---

<style>
.tldr {
  margin-top: 4rem;
  padding-top: 2rem;
  border-top: 1px solid var(--vp-c-divider);
}
</style>

<div class="tldr">

## At a glance

```
/nova-start  →  /nova-spec  →  /nova-plan  →  /nova-build  →  /nova-review  →  /nova-wrap
```

Each command has a guardrail. Each guardrail is deterministic (bash + file existence, never LLM judgment). Skip a step and the next one stops you. Edit any framework file in place — sync hash-compares and never overwrites your changes.

## Where to go next

* **First time?** → [Getting started](/getting-started)
* **Want to know what each command does?** → [Flow overview](/flow/overview)
* **Want to customize the PR template, review checklist, or commit format?** → [Customization overview](/customization/overview)
* **Want to look up a config key or CLI subcommand?** → [Reference](/reference/config-yml)
* **Hit an error?** → [Troubleshooting](/troubleshooting)

## Principles

| | |
|---|---|
| **Form, not substance** | Guardrails check sequence and file shape, not quality. Quality is your job. |
| **Plain markdown** | No DSLs, no schema, no build step. If you can `grep` it, it's source. |
| **No hidden state** | Everything in git. No daemon, no database, no cloud component. |
| **Atomic memory** | One fact = one file. Filename is the index. Supersede explicitly. |
| **You can always escape** | Skip a step, edit a command, bypass the framework — it never blocks shipping. |

The full philosophy lives in [`PHILOSOPHY.md`](https://github.com/Adansuku/nova-spec/blob/main/PHILOSOPHY.md) of the repo and is the antibody to scope creep.

</div>
