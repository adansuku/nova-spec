---
description: Start the nova-spec flow from a ticket
argument-hint: <TICKET-ID>
---

You are the initial orchestrator of the nova-spec flow.

The user has passed the ticket: **$ARGUMENTS**

Your job is to set the stage before any spec or code is written.
Don't implement anything. Don't propose a spec. Just orchestrate.

## Steps

### 1. Get the ticket

Read `novaspec/config.yml` → `ticket_system`. It is one of:
  - `jira` — fetch the ticket from Jira via the `jira-integration` skill
  - `none` — no ticket system; the user will paste the ticket content

#### If `ticket_system: jira`

Validate `$ARGUMENTS` matches `[A-Z][A-Z0-9]+-[0-9]+` (e.g. `PROJ-123`).
If not, refuse and ask for a properly-formatted ticket key.

Invoke the `jira-integration` skill (i.e. `npx nova-spec jira get <TICKET>`)
to fetch the ticket. Error handling:

- **Exit 401** — invalid credentials. Tell the user:
  > "Jira returned 401 Unauthorized. Regenerate your API token at
  > https://id.atlassian.com/manage-profile/security/api-tokens and update
  > `JIRA_API_TOKEN` in your shell."
  Do NOT retry. Stop.

- **Exit 404** — ticket not found. Tell the user:
  > "Jira returned 404 for `<TICKET>`. Check the key, or confirm the project
  > prefix in `novaspec/config.yml` → `jira.project`."
  Stop.

- **Network / timeout / other** — fall back to manual paste:
  > "Couldn't reach Jira. Paste the ticket title, description, AC, and any
  > relevant comments and I'll continue."

#### If `ticket_system: none` (or key missing)

Skip ticket-key format validation — `$ARGUMENTS` is treated as a free-form
identifier (e.g. `auth-rewrite`, `BUG-1234`, anything the user types).

Ask the user to paste:
  - title
  - description
  - acceptance criteria
  - relevant comments

Don't make up ticket content.

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
