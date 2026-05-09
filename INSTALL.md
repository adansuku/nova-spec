# Installing nova-spec

---

## Quick install

```bash
npx nova-spec init
```

The interactive wizard guides you through:

1. **Scope** — install globally (all your projects) or just in the current repo
2. **Runtime** — Claude Code, OpenCode, or both
3. **Jira** — optional: URL, project key, email, Done transition ID
4. **Branch** — base branch (default: `main`)

It generates a ready-to-use `novaspec/config.yml`. No manual editing required.

---

## What gets installed

```
.
├── AGENTS.md                    Repo anchor — first thing the agent reads
├── notes.md                     Scratch pad
│
├── novaspec/                    Framework content (managed by nova-spec)
│   ├── config.yml               Your project config (gitignored)
│   ├── commands/                /nova-* slash commands
│   ├── skills/                  Auxiliary skills (Jira, memory, etc.)
│   ├── agents/                  Subagents (context-loader, review)
│   ├── guardrails/              Shared preconditions
│   ├── templates/               Artifact templates
│   └── custom/                  Your overrides — never touched by sync
│       ├── commands/
│       ├── skills/
│       └── agents/
│
├── .claude/                     Symlinks so Claude Code discovers the commands
│   ├── commands -> ../novaspec/commands
│   ├── skills   -> ../novaspec/skills
│   └── agents   -> ../novaspec/agents
│
├── .opencode/                   (only if you install for OpenCode)
│   └── ... (same symlinks)
│
└── context/                     Architectural memory
    ├── decisions/               Why we did X (one fact per file)
    │   └── archived/
    ├── gotchas/                 Non-obvious traps
    ├── services/                One flat file per service
    └── changes/
        ├── active/              In-progress specs
        └── archive/             Closed specs
```

---

## Global vs project install

| | Global (`~/.claude`) | Project (`.claude/`) |
|---|---|---|
| Works everywhere | ✓ | ✗ |
| Per-repo customization | ✗ | ✓ |
| Commit with the team | ✗ | ✓ |

Choose **global** for personal use. Choose **project** when the team shares the same flow.

---

## Verification

After installing, open Claude Code or OpenCode at the repo root and type `/` — you should see the `/nova-*` commands in autocomplete.

Run your first ticket:

```
/nova-start TICKET-ID
```

---

## Customizing skills and commands

Override any core skill or command by copying it to `novaspec/custom/`:

```bash
# Example: customize the nova-wrap command
cp novaspec/commands/nova-wrap.md novaspec/custom/commands/nova-wrap.md
# Edit novaspec/custom/commands/nova-wrap.md
```

The custom version takes priority. `novaspec/custom/` is gitignored by default — if your team needs to share customizations, remove the gitignore entry.

---

## Keeping up to date

```bash
npx nova-spec sync
```

Or from inside Claude Code / OpenCode:

```
/nova-sync
```

This updates the core files, preserves your `custom/` folder and `config.yml`, and reports if any of your custom overrides have upstream changes worth reviewing.

---

## Uninstall

```bash
rm -rf novaspec .claude .opencode
rm -f AGENTS.md notes.md
```

> This also removes all architectural memory (`context/`). Move it elsewhere first if you want to keep it.

---

## Common issues

### Commands don't show up

1. Check symlinks: `ls -la .claude/`
2. Restart Claude Code (it sometimes caches the listing)
3. Verify files in `novaspec/commands/` have valid frontmatter (`description:`)

### Broken symlinks after cloning

```bash
git config core.symlinks true
git reset --hard HEAD
```

On native Windows, symlinks require Developer Mode or admin. Use WSL instead.
