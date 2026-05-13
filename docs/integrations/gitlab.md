---
description: GitLab skill — rich agentic operations for self-hosted or cloud projects, complementing the generic forge abstraction.
---

# GitLab integration

nova-spec ships **two** layers for GitLab:

1. **`lib/forge.js`** — a generic abstraction used by `/nova-wrap` to create MRs. Portable across GitHub (`gh`) and GitLab (`glab`). Token never on the command line. Used automatically by the framework.

2. **`novaspec/skills/gitlab/SKILL.md`** — a richer skill for team-specific GitLab operations: review MRs, check pipelines, list open MRs, approve, merge, create branch from a Jira ticket. You invoke this directly with `/gitlab <action>`.

Both layers coexist. The framework uses (1) automatically; humans use (2) for everything else.

## When to use which

| You want to... | Use |
|---|---|
| Open a PR / MR as part of `/nova-wrap` | `forge` (automatic — no action needed) |
| Create an MR with the team's custom body template + squash + target branch | `/gitlab create` |
| Review an existing MR | `/gitlab review <ID>` |
| Check pipeline status for the current branch | `/gitlab pipeline` |
| List open MRs in the project | `/gitlab list` |
| List MRs you created or that are assigned to you | `/gitlab my` / `/gitlab assigned` |
| Approve / merge an MR | `/gitlab review <ID>` then approve, or `/gitlab merge <ID>` |
| Create a branch from a Jira ticket (with the right prefix from the ticket type) | `/gitlab branch <TICKET>` |

For PR/MR creation specifically: `forge pr-command` is **portable** (works on GitHub + GitLab), `/gitlab create` is **richer** (reads `novaspec/templates/pr-body.md`, sets squash, reads target branch from `config.yml → branch.base`). Both can coexist — `/nova-wrap` uses `forge` by default; you can customise `nova-wrap.md` to invoke the `gitlab` skill instead if you prefer.

## Setup

### 1. Install the GitLab CLI

```bash
# macOS
brew install glab

# Debian/Ubuntu
sudo apt install glab
```

### 2. Authenticate `glab` (only needed for the `forge` layer)

```bash
glab auth login --hostname gitlab.com
# Or for self-hosted:
glab auth login --hostname gitlab.your-company.com
```

This stores a Personal Access Token in `~/.config/glab-cli/`. The `forge` abstraction uses it for MR creation.

### 3. (Optional) PAT for the rich skill

The `gitlab` skill uses curl directly against the API instead of going through `glab` — it needs the token as an env var:

```bash
# ~/.zshrc or ~/.bashrc
export GITLAB_HOST="https://repo.your-company.com"
export GITLAB_TOKEN="glpat-your-token"
```

Get the PAT at: **your GitLab → user avatar → Edit profile → Access tokens**. Scopes: `api`, `read_repository`, `write_repository`.

If you only use `/nova-wrap` (and not the `/gitlab` slash commands), `glab auth login` is enough — you don't need to set `GITLAB_TOKEN`.

### 4. (Optional) Jira credentials for `/gitlab branch`

`/gitlab branch <TICKET>` fetches the ticket type from Jira so it can pick the right branch prefix (`feature/`, `bugfix/`, `hotfix/`). It uses the same env vars as the `jira-integration` skill: `JIRA_HOST`, `JIRA_EMAIL`, `JIRA_API_TOKEN`.

If you'd rather, use `/nova-start <TICKET>` instead — the framework's `/nova-start` does the same branch creation (plus context loading) and only needs the Jira config that `npx nova-spec init` already set up.

## Operations exposed

```text
/gitlab                   # interactive menu
/gitlab branch <TICKET>   # create branch from a Jira ticket  (shortcut: /gl-branch)
/gitlab create            # create MR from current branch     (shortcut: /gl-create)
/gitlab review <ID>       # review an existing MR             (shortcut: /gl-review)
/gitlab list              # list open MRs                     (shortcut: /gl-list)
/gitlab pipeline          # check pipeline status             (shortcut: /gl-pipeline)
/gitlab my                # your open MRs
/gitlab assigned          # MRs assigned to you
/gitlab merge <ID>        # merge an MR
```

Read `novaspec/skills/gitlab/SKILL.md` for the exact bash + curl recipe each action uses.

## How the skill plays with framework files

The skill reads from `novaspec/`:

- `novaspec/templates/pr-body.md` → MR description body (for `/gitlab create`)
- `novaspec/config.yml → branch.base` → target branch for MRs (default `develop`, falls back if missing)
- `novaspec/config.yml → branch.types` → branch prefix mapping (when creating branches from Jira tickets)

This means: **customising MR behaviour is just editing those files**. You don't fork the skill itself.

## Self-hosted GitLab

The skill works against any GitLab host — set `GITLAB_HOST` to your self-hosted URL and `glab auth login --hostname` to the same. All API calls use `-k` in curl by default (skips SSL verification) for environments with internal CAs; remove `-k` if you're on `gitlab.com` and want strict TLS.

## Errors and fixes

### `glab: command not found`

You haven't installed `glab`. `brew install glab` (macOS) or equivalent. The `forge` abstraction will fall back to error-with-fix-instructions; `/gitlab` actions will fail entirely.

### `glab` is installed but `/nova-wrap` can't create MR

Run `glab auth login`. The CLI authentication is separate from the rich-skill `GITLAB_TOKEN` env var — `glab` needs its own auth dance.

### `401 Unauthorized` from the rich skill

`GITLAB_TOKEN` is invalid or expired. Regenerate at your GitLab profile, update the env var, reload shell.

### `404 Not Found` on `/gitlab review <ID>`

The MR ID is wrong, or you're authenticated to a different GitLab host. Confirm with `glab mr view <ID>` first.

### SSL errors on self-hosted

The skill uses `-k` in curl by default. If you removed `-k` and your corporate GitLab uses an internal CA, either re-add `-k` or import the CA into your system trust store.

## What lives where

* `lib/forge.js` — generic CLI builder (`gh pr create` / `glab mr create`). Used by `/nova-wrap`.
* `lib/cli.js → runForge` — exposes `npx nova-spec forge detect / pr-command / term`.
* `novaspec/skills/gitlab/SKILL.md` — the rich skill (branch, create, review, pipeline, list, merge).
* `novaspec/templates/pr-body.md` — MR body template, read by both layers.
* `novaspec/config.yml → forge`, `branch.base`, `branch.types` — configuration.

You can override any of these by editing them in place — sync respects local edits via hash-compare.
