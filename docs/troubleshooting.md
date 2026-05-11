---
description: Common errors and how to fix them, organized by symptom.
---

# Troubleshooting

If something's not working, check `~/.nova-spec.log` first — auto-sync errors land there silently.

## Installation

### `HOME / USERPROFILE not set`

The installer can't resolve the global path.

**Fix**: ensure `$HOME` (Linux/macOS) or `$USERPROFILE` (Windows) is set. Or use a project install (`scope: project`) which uses `process.cwd()` instead.

### Symlink errors on Windows

Windows requires Developer Mode (or admin) for `fs.symlinkSync` on regular files. The installer falls back to `'junction'` for directories, which works without elevated privileges.

**Fix**: enable Developer Mode in Windows Settings, or use WSL.

### `Could not parse settings.local.json`

The installer found malformed JSON in `.claude/settings.local.json` or `.opencode/settings.local.json`.

**Fix**: open the file, fix the JSON manually (a missing comma, a stray quote), re-run init or sync.

### `nova-spec not installed in this directory`

Running `sync` outside a project that has `novaspec/`.

**Fix**: `cd` to your project root, or run `npx nova-spec init` first.

## Slash commands not appearing

### `/nova-*` doesn't show up in the autocomplete

Possible causes:

1. **Symlinks not created**. Check `ls -la .claude/` — you should see `commands -> ../novaspec/commands` (and `skills`, `agents`).
2. **Claude Code cached the listing**. Restart Claude Code.
3. **Frontmatter missing**. Each command file in `novaspec/commands/` needs `---\ndescription: ...\n---` at the top.
4. **Wrong runtime**. If you only installed for OpenCode, Claude Code won't see anything. Re-run `init` and choose `both`.

### Broken symlinks after cloning the repo

When teammates clone the repo on Windows, symlinks may be checked out as text files (containing the target path).

**Fix**:
```bash
git config core.symlinks true
git reset --hard HEAD
```

On native Windows, also enable Developer Mode. WSL handles symlinks correctly without ceremony.

## /nova-start

### `Working tree is dirty`

You have uncommitted changes.

**Fix**: commit or stash, then re-run.

### `Branch pattern doesn't match`

Your branch isn't `<type>/<TICKET>-<slug>`. Either you ran `/nova-start` from an unrelated branch, or your `branch.types` config doesn't include the type you used.

**Fix**: check `novaspec/config.yml` → `branch.types` and add or rename. Or run `/nova-start <TICKET>` from a clean branch — the framework creates the right one.

### `Jira returned 401 Unauthorized`

`JIRA_API_TOKEN` is invalid or expired.

**Fix**:
1. Go to [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Create a new token
3. Update `JIRA_API_TOKEN` in your shell rc (`~/.zshrc` / `~/.bashrc` / direnv / 1Password CLI)
4. Reload the shell or restart Claude Code

### `Jira returned 404 for PROJ-42`

Wrong key or wrong project prefix.

**Fix**: confirm the key opens in the browser. If yes, check `jira.project` in `config.yml` matches.

### `Couldn't reach Jira`

Network or VPN.

**Fix**: nova-spec falls back to manual paste — paste the ticket content when prompted. Re-running won't help if the network is the issue.

## /nova-spec

### `close-requirement` keeps asking questions in a loop

Some required dimension is still open. The skill won't draft until all six are closed.

**Fix**: pick a default for the open dimension — even if it's "we'll just go with X for now". Stalling on perfection is the failure mode.

### Spec written but full of `TBD` / `TODO`

The skill drafted before closing decisions, or you bypassed it manually.

**Fix**: re-run `/nova-spec` and answer fully, or edit `proposal.md` directly to close the gaps. Guardrail #7 will block `/nova-plan` until they're gone.

## /nova-plan

### `✗ Proposal has open markers`

Guardrail #7 (`proposal-closed`) found `TBD`, `TODO`, `FIXME`, `???`, `<placeholder>`, or `[ ] decision` in `proposal.md`.

**Fix**: open `proposal.md`, replace the markers with concrete content. The script prints the offending lines.

### Plan invents scope not in the spec

The agent over-reached.

**Fix**: re-prompt with *"the spec doesn't say X — drop the corresponding tasks or update the spec first"*. Or edit `tasks.md` by hand to remove the extras.

## /nova-build

### Task marked `- [!]`

A task failed (test red, unexpected error). The agent stopped instead of plowing through.

**Fix**: read the message in `tasks.md` next to the `[!]`, fix the underlying issue, re-run `/nova-build`. The framework will pick up at the failed task.

### Agent does too much per task

The task definitions in `tasks.md` are too coarse.

**Fix**: edit `tasks.md`, split the offending task into smaller ones, re-run.

## /nova-review

### `✗ Empty diff`

No changes committed or staged against the base branch.

**Fix**: confirm `branch.base` in config matches the actual base. Make a commit. If you just amended, you might need to refresh the branch tracking.

### `✗ Files declared in tasks.md but missing from diff`

Your `tasks.md → ## Files to touch` lists paths that don't show up in the diff.

**Fix**: either touch those files (you forgot a task), or update `tasks.md` to remove paths you decided not to change.

### `✗ Lint failed` or `✗ Tests failed`

Your project has a `lint` or `test` script in `package.json` and it exits non-zero.

**Fix**: run `npm run lint` / `npm test` locally, fix the failures, re-run review.

### Verdict is `✗ Needs fixes` despite deterministic checks passing

The 4-axis LLM review found blockers. Read `review.md` for specifics.

**Fix**: address the blockers, re-run `/nova-review` until verdict is `✓`.

## /nova-wrap

### `✗ Review not approved`

Guardrail #5 needs the literal line `✓ Ready for /nova-wrap` in `review.md`.

**Fix**: run `/nova-review` until the verdict is `✓`. Don't fake it by editing `review.md` — the next dev reading the archive will be confused.

### `gh: command not found` / `glab: command not found`

The forge CLI for your repo isn't installed.

**Fix**: install it ([gh](https://cli.github.com/), [glab](https://gitlab.com/gitlab-org/cli)) and authenticate. Or set `forge.type: none` in config and push manually.

### Jira returns 400 on the close transition

The `transitions.done` ID is wrong for the current ticket state.

**Fix**:
```bash
npx nova-spec jira transitions <TICKET-KEY>
```
Pick the right transition by name, update `jira.transitions.done` in config.

Note: the transition must be **available from the current ticket status**. If the ticket is in "Backlog", "Done" might not be reachable directly — your workflow may require it to pass through "In Review" first.

### Superseded decision still at root

You wrote `> Supersedes: <X>.md` in a new decision but didn't archive `<X>.md`.

**Fix**:
```bash
git mv context/decisions/<X>.md context/decisions/archived/<X>.md
```

## Sync

### `Could not parse novaspec/.nova-manifest.json`

The manifest is corrupt.

**Fix**: delete it. The next sync treats every file as "no previous shipped hash" and proceeds conservatively (skips edits, regenerates). Slightly conservative but never destructive.

### Files I edited got overwritten

Either:

1. The hash was the same as the previously-shipped one (you didn't actually edit, or your edit reverted to default). Sync correctly overwrote.
2. The manifest didn't have an entry for that file (e.g. you deleted the manifest). Sync defaults to "previous hash unknown → if current matches new, no-op; if current matches old shipped, overwrite". Without manifest, the second clause can't fire and we skip — but you might have hit a corner case.

**Fix**: open `git log -p <file>` to see if your edits are recoverable. They should be in commits.

If sync is genuinely overwriting your edits despite the manifest tracking them: that's a bug, please report.

## Auto-sync hook

### Session start is slow

Every session does an `npx nova-spec@latest` registry check. Slow registry = slow start.

**Fix**: switch npm registry to a closer mirror (`npm config set registry https://...`), or remove the hook to disable auto-sync (you'll need to run `nova-spec sync` manually).

### Hook overwrote my custom SessionStart hook

`ensureSessionStartHook` is supposed to identify nova-spec's hook by the `# nova-spec auto-sync` marker and never touch others. If yours got overwritten:

**Fix**: re-add yours manually. Confirm yours doesn't contain the marker substring. Report the bug.

### Errors not showing up anywhere

The hook logs to `~/.nova-spec.log`.

**Fix**:
```bash
tail -50 ~/.nova-spec.log
```

If the log file doesn't exist, the hook hasn't run yet (or your homedir is non-standard).

## Manifest

### `outdated_customs` references in old commands

You're on an old version that still uses the `custom/` overlay model.

**Fix**:
```bash
npx nova-spec@latest sync
```

The new model has dropped that concept entirely.

## Custom edits

### `npx nova-spec sync` keeps marking my file as edited

That's by design. Sync correctly identified your edit and is preserving it.

**Fix**: nothing to fix unless upstream changed and you want to merge. Run `/nova-diff <path>` to see the upstream diff and decide.

### How do I see what changed upstream?

```bash
/nova-diff novaspec/templates/pr-body.md
```

Or directly:
```bash
diff -u "$(npx nova-spec source novaspec/templates/pr-body.md)" novaspec/templates/pr-body.md
```

## Where to go for more

* [Architecture → Sync internals](architecture/sync-internals.md) — how sync makes decisions
* [Architecture → Auto-sync hook](architecture/auto-sync-hook.md) — what the hook actually runs
* [Reference → Guardrails](reference/guardrails.md) — what each block means and how to bypass
* [Reference → CLI](reference/cli.md) — every subcommand and exit code
