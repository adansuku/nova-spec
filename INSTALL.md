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
├── novaspec/                    Framework content (edit any file directly)
│   ├── config.yml               Your project config (gitignored)
│   ├── commands/                /nova-* slash commands
│   ├── skills/                  Auxiliary skills (Jira, memory, etc.)
│   ├── agents/                  Subagents (context-loader, review)
│   ├── guardrails/              Shared preconditions (bash scripts)
│   ├── templates/               Artifact templates (PR body, commit, etc.)
│   └── .nova-manifest.json      Tracks last-shipped hashes (gitignored)
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

## Customizing the framework

Edit any file under `novaspec/` directly. There is no separate "custom" folder — your edits live where they're used:

```bash
# Customize the PR/MR description for your team
$EDITOR novaspec/templates/pr-body.md

# Add an extra step to /nova-wrap
$EDITOR novaspec/commands/nova-wrap.md
```

When `npx nova-spec sync` runs, it hashes every framework file and compares it with what was last shipped. If it matches → safe to overwrite with the new version. If it differs → you've edited it, sync skips it and reports the path so you can `/nova-diff <path>` to see what changed upstream.

Your customizations are part of your repo. Commit them with the team — every developer gets the same flow.

---

## Keeping up to date

`npx nova-spec sync` runs automatically every time Claude Code or OpenCode start (via a `SessionStart` hook). You can also run it manually:

```bash
npx nova-spec sync
```

Or from inside Claude Code / OpenCode:

```
/nova-sync
```

The sync report lists: new files, updated files (untouched locally), skipped files (you edited), and removed files. Your local edits are always preserved.

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
