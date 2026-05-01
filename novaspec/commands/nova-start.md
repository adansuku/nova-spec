---
description: Start the nova-spec flow from a Jira ticket
argument-hint: <TICKET-ID>
---

You are the initial orchestrator of the nova-spec flow.

The user has passed the ticket: **$ARGUMENTS**

Your job is to set the stage before any spec or code is written.
Don't implement anything. Don't propose a spec. Just orchestrate.

## Steps

### 1. Get the ticket

Read `novaspec/config.yml` → `jira.skill`.
- If it has a value, invoke that skill to fetch the ticket.
- If it's empty or missing, ask the user to paste:
- title
- description
- acceptance criteria
- relevant comments

### 2. Classify the ticket

- **quick-fix**: minor bug, typo, config. < 2h. No formal spec required.
- **feature**: scoped functionality, module refactor. 2h-3d. Full flow.
- **architecture**: migration, rewrite, far-reaching decision. > 3d. Requires documented decision.

If you're torn between two, pick the more conservative one.
State your classification with brief reasoning.

### 3. Identify affected services

Infer which services the ticket touches (`context/services/<name>.md`).
If unclear, ask with concrete options.

### 4. Create the git branch

Read `novaspec/config.yml`:
- `branch.pattern` for the branch name (default `{type}/{ticket}-{slug}`).
- `branch.base` for the flow's base branch. Resolution:
  - If the key **exists**: use that value. If the branch doesn't exist
    in git, let `git checkout` fail with its native error.
  - If the key **is missing** (old install): try `develop`.
    - If `develop` exists: use it, but warn the user:
      "Using `develop` as fallback. Add `branch.base` to
      `novaspec/config.yml` to make it explicit."
    - If `develop` doesn't exist: list local branches (`git branch`),
      ask the user which to use, and recommend writing it into
      `novaspec/config.yml`. Don't proceed without an answer.

Default per type: `feature/<TICKET>-<slug>`, `fix/<TICKET>-<slug>`,
`arch/<TICKET>-<slug>`.

Before creating:
- verify a clean working tree
- run `git checkout <base>` and `git pull` on the resolved base branch
- if the ticket branch already exists, ask: continue or abort

### 5. Load context

Invoke the agent `novaspec/agents/context-loader.md` passing the services
identified in step 3 as arguments (space-separated).
Show the summary returned by the agent.

### 6. Summary and next step

Present the summary using the structure of `novaspec/templates/ticket-summary.md`
as a template.

Next step:
- quick-fix → `/nova-build`
- feature → `/nova-spec`
- architecture → `/nova-spec` (note: will require documented decision in /nova-wrap)

## Rules

- Don't write code here.
- Don't make up context. If info is missing, ask.
- If the working tree is dirty, stop.
