---
description: Multi-forge support — GitHub (gh) and GitLab (glab) via auto-detection or explicit config.
---

# Forge (GitHub & GitLab)

`/nova-wrap` opens a PR on GitHub or an MR on GitLab. The decision is delegated to a small abstraction in `lib/forge.js` — no command hardcodes `gh`.

## What's supported

| Forge | CLI | Required by |
|---|---|---|
| GitHub | `gh` | Default for `*github.com*` remotes |
| GitLab (cloud or self-hosted) | `glab` | Default for `*gitlab.*` remotes |
| Bitbucket | — | Detected but not implemented; falls back to manual |
| Anything else | — | `forge.type: none` → manual `git push` + URL |

## Auto-detection

By default, nova-spec detects the forge from `git remote get-url origin`:

| Remote URL contains | Detected forge |
|---|---|
| `github.com` | `github` |
| `gitlab.com` or `gitlab.<custom>` | `gitlab` |
| `bitbucket.org` | `bitbucket` |
| anything else | `null` |

Detection runs at install time and at every `nova-spec forge detect` call.

## Config

```yaml
# novaspec/config.yml
forge:
  type: auto         # auto | github | gitlab | bitbucket | none
  cli: auto          # auto | gh | glab | <custom>
```

* `type: auto` — re-detect from the git remote each time
* `type: github` / `type: gitlab` — force, ignore the remote
* `type: none` — disable PR/MR creation; `/nova-wrap` just commits and tells you to push manually
* `cli: auto` — pick the standard CLI for the forge type (`gh` for github, `glab` for gitlab)
* `cli: <custom>` — override (e.g. if your team installed `gh` under a different name)

## CLI subcommand

```bash
# What does forge auto-detect for this repo?
npx nova-spec forge detect

# Build the PR/MR creation command
npx nova-spec forge pr-command "Title" "Body" "main"

# What does the forge call PRs vs MRs?
npx nova-spec forge term     # → "PR" or "MR"
```

`/nova-wrap` invokes `pr-command`, then asks the user to confirm before executing the printed command.

## What gets emitted

| Forge | Command |
|---|---|
| `github` | `gh pr create --base <base> --title <title> --body <body>` |
| `gitlab` | `glab mr create --target-branch <base> --title <title> --description <body> --fill` |

The `--fill` on `glab` lets the CLI auto-populate from the last commit if any field is empty (defensive default; the agent always passes title and body explicitly).

## Installing the CLIs

### `gh` (GitHub)

```bash
brew install gh                       # macOS
sudo apt install gh                   # Debian/Ubuntu
winget install GitHub.cli             # Windows
```

Then `gh auth login`. Tokens for non-interactive use: `gh auth login --with-token < token.txt`.

### `glab` (GitLab)

```bash
brew install glab                     # macOS
sudo apt install glab                 # Debian/Ubuntu (recent)
winget install GLab.GLab              # Windows
```

Then `glab auth login --hostname gitlab.com` (or your self-hosted host).

For GitLab self-hosted, set the host explicitly:

```bash
glab config set -g host gitlab.your-company.com
```

## Errors and fixes

### `gh: command not found` or `glab: command not found`

The CLI for your forge isn't installed.

**Fix**: install it (above), or set `forge.type: none` and push manually.

### `gh: not authenticated`

The CLI is installed but you haven't logged in.

**Fix**: `gh auth login` (or `glab auth login`).

### `unknown forge: bitbucket`

Bitbucket detection works but no adapter is implemented.

**Fix**: write a small wrapper in your team that does the right thing for Bitbucket, override `nova-wrap.md` to call it, or set `forge.type: none` and push manually.

### Wrong base branch

If `/nova-wrap` opens a PR against the wrong base, check `branch.base` in `config.yml`. The default is `main`; if you use `develop`, set it explicitly.

## Self-hosted GitLab

`glab` supports any GitLab host. Two ways to configure:

```bash
# Per-machine
glab config set -g host gitlab.your-company.com

# Per-repo
glab config set host gitlab.your-company.com
```

Both work transparently with `nova-spec forge pr-command` once configured.

## What lives where

* `lib/forge.js` — detection + adapters
* `lib/cli.js` → `runForge` — CLI subcommand
* `novaspec/commands/nova-wrap.md` — calls `npx nova-spec forge pr-command` and `term`
* `novaspec/config.yml` → `forge:` — your config

## Adding a new forge

If you need Bitbucket or a custom forge, fork `lib/forge.js` and add a case to `buildPrCommand`:

```js
if (forge === 'bitbucket' || resolvedCli === 'bb') {
  return `bb pr create --source ${q(currentBranch)} --destination ${q(base)} --title ${q(title)} --description ${q(body)}`;
}
```

Add detection in `detectForge` if needed. That's the whole change — no other file knows about specific forges.
