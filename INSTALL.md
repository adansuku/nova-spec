# Installing nova-spec

Guide to install the nova-spec framework into any repository.

---

## Prerequisites

- Git
- Claude Code installed
- Bash (macOS, Linux, or WSL on Windows)
- A repository where you want to install the framework (it can be empty
  or already have content)

> **Note about Windows**: the symlinks nova-spec uses require special
> permissions on native Windows (Developer Mode or admin). Using **WSL**
> is recommended to avoid friction.

---

## Quick install

### 1. Clone the `nova-spec` repo locally

```bash
git clone <nova-spec-repo-url> /path/to/nova-spec
```

`install.sh` copies content from its own location, so you need the repo
accessible on disk. The destination can be anywhere.

### 2. Move into the target repo

```bash
cd /path/to/your/repo
```

> Tip: if you don't want to `cd` (or don't remember the path), run the
> installer from anywhere with `--path` or `--pick` (see below).

### 3. Run with the absolute path to the script

```bash
bash /path/to/nova-spec/install.sh
```

The script detects its own location (`SCRIPT_DIR`) and copies `novaspec/`
and `AGENTS.md` from there into the current directory. The destination
is `$PWD`.

Useful options:

```bash
# install in a path without cd-ing first
bash /path/to/nova-spec/install.sh --path /path/to/your/repo

# pick the destination folder (menu); if fzf is installed, supports search
bash /path/to/nova-spec/install.sh --pick
```

Choose the runtime:

```bash
# Claude Code only
bash /path/to/nova-spec/install.sh --target claude

# OpenCode only
bash /path/to/nova-spec/install.sh --target opencode

# Both (recommended if your team uses both)
bash /path/to/nova-spec/install.sh --target both
```

It's idempotent: running it multiple times regenerates `novaspec/` and
`AGENTS.md` from source, but **leaves untouched** `context/`, `notes.md`
and any work-in-progress files in `context/changes/`.

If you run the script from a directory where it can't find its sources
(`novaspec/` and `AGENTS.md` in the same `SCRIPT_DIR`), it aborts with
an error message and a non-zero exit code.

---

## What gets installed

```
.
├── AGENTS.md                    Repo anchor — first thing Claude reads
├── notes.md                     Usage notes (for iteration)
│
├── novaspec/                    Canonical framework content
│   ├── config.yml               Conventions (branches, ticket types)
│   ├── commands/                7 `/nova-*` slash commands
│   ├── skills/                  Auxiliary skills (Jira optional, memory, etc.)
│   ├── agents/                  Subagents (context-loader, review)
│   ├── guardrails/              Shared preconditions
│   └── templates/               Artifact templates (proposal/tasks/review)
│
├── .claude/                     Symlinks so Claude Code discovers the commands
│   ├── commands -> ../novaspec/commands
│   ├── skills   -> ../novaspec/skills
│   └── agents   -> ../novaspec/agents
│
├── .opencode/                   (only if you install for OpenCode)
│   ├── commands -> ../novaspec/commands
│   ├── skills   -> ../novaspec/skills
│   └── agents   -> ../novaspec/agents
│
└── context/                     Architectural memory
    ├── decisions/               Why we did X (one fact per file)
    │   └── archived/            Superseded (not auto-loaded)
    ├── gotchas/                 Non-obvious traps
    ├── services/                One flat file per service (≤80 lines)
    └── changes/
        ├── active/              In-progress specs (open tickets)
        └── archive/             Specs archived after closing a ticket
```

---

## Verification

### 1. `.claude/` symlinks

```bash
ls -la .claude/
```

You should see three `->` arrows:

```
agents   -> ../novaspec/agents
commands -> ../novaspec/commands
skills   -> ../novaspec/skills
```

### 2. Commands in Claude Code

Open Claude Code at the repo root:

```bash
claude
```

Type `/` and check that the 7 commands appear in autocomplete:

- `/nova-start`
- `/nova-spec`
- `/nova-plan`
- `/nova-build`
- `/nova-review`
- `/nova-wrap`
- `/nova-status`

### 3. First ticket

Recommended: start with a small, low-risk ticket.

```
/nova-start TICKET-ID
```

The command walks you through it step by step.

---

## Customization

### Branch conventions

Edit `novaspec/config.yml`:

```yaml
branch:
  pattern: "{type}/{ticket}-{slug}"
  types:
    quick-fix: fix
    feature: feature
    architecture: arch
  ticket_case: upper    # upper | lower
  base: main            # base branch of the flow
```

`branch.base` controls the branch each ticket branch is created from in
`/nova-start` and the branch the PR opens against in `/nova-wrap`. Safe
default for conventional repos; switch to `develop` or another if your
repo uses a different integration branch.

### Document your services

For each relevant service in your project, create:

```
context/services/<service-name>.md
```

The `update-service-context` skill generates the template the first time
you invoke it for a new service.

### Carry over previous decisions

If your project already has relevant technical decisions, document them
as atomic files in `context/decisions/` (filename = concept). When a
decision becomes obsolete, create a new one with `> Supersedes: <old>.md`
and `git mv` the old one to `context/decisions/archived/`.

---

## What goes to git vs local (recommended)

In consumer projects, treat `context/` as **team coordination** (goes to
git) and treat credentials/personal config as **local**.

**Goes to git (recommended)**:
- `context/decisions/`, `context/gotchas/`, `context/services/`
- `context/changes/active/` and `context/changes/archive/` (specs are coordination)
- `novaspec/` (installed framework)
- `.claude/` (symlinks to `novaspec/` so the team sees the commands)
- `.opencode/agents|commands|skills` (equivalent symlinks if you use OpenCode)

**Goes local (recommended)**:
- `novaspec/config.yml` (contains the project's Jira/email/token)
- `notes.md`, `.env`
- `.opencode/settings.local.json`

---

## Updating the framework

To update nova-spec in an already-installed repo, update your local
clone of the nova-spec repo (`git pull`) and re-run the script from
your destination repo:

```bash
cd /path/to/nova-spec && git pull
cd /path/to/your/repo && bash /path/to/nova-spec/install.sh
```

The script overwrites `novaspec/` and `AGENTS.md` with the source
version. It **does not touch** `context/`, `notes.md` or any
work-in-progress files in `context/changes/`.

> If you've customized any command or skill in the destination repo,
> commit your changes before updating, or work on a separate branch to
> reconcile them.

---

## Uninstall

```bash
rm -rf novaspec .claude .opencode
rm -f AGENTS.md notes.md
```

> This also removes all architectural memory (`context/`). If you want
> to keep it, move it elsewhere first.

---

## Common issues

### Commands don't show up in Claude Code

1. Check the symlinks: `ls -la .claude/`.
2. Close and reopen Claude Code (it sometimes caches the listing).
3. Verify the files in `novaspec/commands/` have valid frontmatter
   (with at least `description:`).

### "Can't find the `load-context` skill"

- Check that `novaspec/skills/load-context/SKILL.md` exists.
- Check that the frontmatter has `name:` and `description:`.
- Make sure the `.claude/skills` symlink points to `../novaspec/skills`.

### Broken symlinks after cloning the repo

If you clone to another machine and the symlinks don't work:

```bash
git config core.symlinks true
git reset --hard HEAD
```

On native Windows, symlinks require **Developer Mode** enabled or admin
permissions. The recommended alternative is **WSL**.

### `install.sh` fails with "permission denied"

Run it explicitly with `bash` instead of making it executable:

```bash
bash install.sh
```

---

## Next step

Read [README.md](./README.md) to understand the full nova-spec flow.
