---
description: How nova-spec stays up to date automatically — the SessionStart hook.
---

# Auto-sync hook

Every developer on the team gets the latest framework version **without thinking about it**, via a hook that runs at every Claude Code (and OpenCode) session start.

## What it does

When Claude Code starts a session, it reads `.claude/settings.local.json`, looks for `hooks.SessionStart`, and runs each command. nova-spec's installer adds one such command:

```bash
npx nova-spec@latest sync >> ~/.nova-spec.log 2>&1 || true # nova-spec auto-sync
```

Three deliberate parts:

1. **`npx nova-spec@latest`** — `@latest` forces npm to re-check the registry. Without it, `npx` would happily run a cached version forever. Cost: a network call each session start (~1-2 seconds when no update is available).
2. **`sync`** — the regular sync, with the same hash-compare protection for your edits.
3. **`>> ~/.nova-spec.log 2>&1 || true`** — append all output (stdout + stderr) to a log, never block session start. Errors don't kill your IDE; you can find them in `~/.nova-spec.log` if anything's wrong.

The trailing `# nova-spec auto-sync` is a marker so `ensureSessionStartHook` can identify our hook in an array of multiple SessionStart hooks (other tools or your own).

## Where it lives

| Runtime | File |
|---|---|
| Claude Code | `.claude/settings.local.json` |
| OpenCode | `.opencode/settings.local.json` |

Both files are gitignored by default — each developer has their own. The hook is added by `npx nova-spec init` and refreshed by `npx nova-spec sync`.

The full structure:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "npx nova-spec@latest sync >> /Users/you/.nova-spec.log 2>&1 || true # nova-spec auto-sync",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

## Why `@latest` and not a pinned version

Tradeoff:

* **`@latest`** — every dev always gets the newest package. Update the framework, push a new npm version, every dev's next session reflects it. **Risk**: a broken release breaks everyone's auto-sync (logged, doesn't block startup).
* **Pinned version** — every dev locks to whatever was current when they installed. Updates require manual `npm install`. **Risk**: bit rot — your team is on three different versions and nobody noticed.

For an internal team: `@latest` is right. The blast radius is one log line in `~/.nova-spec.log`. The benefit is uniformity without coordination.

For an OSS project with thousands of users: `@latest` is risky and you'd want to gate updates behind a manual sync. nova-spec ships `@latest` and explicitly trades that for the convenience.

## Why log-to-file and not silenced

The old design used `2>/dev/null`. That swallows every error — including "your token is malformed" or "your manifest is corrupt". Symptoms surface much later, with no breadcrumb.

`>> ~/.nova-spec.log 2>&1` keeps every line. If something seems off, `tail -50 ~/.nova-spec.log` shows the last few sync runs. Disk cost over a year is negligible (each line is short, file rotation isn't needed in practice).

## Why `|| true` and not exit-on-error

A failing `SessionStart` hook in some IDE configurations blocks startup. We don't want a bad sync to mean "you can't open Claude Code". `|| true` ensures the exit code is always 0, while still logging the failure.

The cost: silent failures. Mitigation: the log file is the breadcrumb. If sync hasn't actually been running, you'd notice your `nova-spec` version is stale (`/nova-status` would still work, you just wouldn't have new framework features).

## Identification by marker

The hook's command string contains `# nova-spec auto-sync`. `ensureSessionStartHook` (called from sync) iterates `settings.local.json` → `hooks.SessionStart`, finds any element with that marker, and:

* If found and matches current expected command: no-op
* If found but command differs (e.g. log path changed): replaces in place
* If not found: appends a new element

This means you can have **other** SessionStart hooks in the same file — your own, your team's — and we won't touch them. We only own the one with our marker.

If you want to disable our hook temporarily, comment out the line or remove that array element manually. The next `nova-spec sync` will add it back. To disable permanently, replace its command with `:` (no-op) or fork the repo.

## Frequency

The hook runs **every session start** — opening Claude Code, switching projects in the same window, restarting the IDE. There's no rate limiting. Each run does:

* npm registry check (~500ms when no update)
* Manifest read + hash compare (instant for ~30 small files)
* Migrations (instant unless config changed)
* Hook refresh (instant)

Total: under 2 seconds in steady state. Visible only as a brief pause when starting a session.

## OpenCode behavior

OpenCode's hook system is similar. The installer writes the same hook to `.opencode/settings.local.json` if you choose `opencode` or `both` as runtime.

If you use OpenCode without hook support (older versions or self-hosted), the agent in `AGENTS.md` is instructed to call `/nova-sync` at the start of every session as a fallback. Less reliable (depends on the agent following the instruction) but better than nothing.

## Disabling auto-sync entirely

Three ways:

1. **Edit `.claude/settings.local.json`**: remove the SessionStart hook block. nova-spec will re-add it on next manual sync — repeat the removal or set the command to `:`.
2. **Set `NOVA_SPEC_NO_HOOK=1`** in your shell. The CLI doesn't currently respect this — but you could add it to `lib/sync.js` and `lib/installer.js` if you want a switch.
3. **Pin the npm version** in `package.json` if your project depends on `nova-spec` directly. Otherwise, your team's `@latest` resolution can't be locked from a single config file.

For most teams: don't disable. The whole point is "I shouldn't have to think about whether my framework is current".

## Failure modes

| Symptom | Likely cause | Fix |
|---|---|---|
| Session takes 5+ seconds to start | npm registry slow | Switch to a faster registry mirror or pin |
| `~/.nova-spec.log` keeps showing parse errors | Corrupted `settings.local.json` | Open and validate the JSON; sync skips on parse error rather than overwriting |
| New framework features don't show up after `npm publish` | `npx` cached or hook isn't firing | Run `npx nova-spec@latest sync` manually; check the log |
| Hook overwrote my unrelated SessionStart hook | Marker logic broken (shouldn't happen) | Re-add yours; report the bug — `ensureSessionStartHook` should never touch hooks without the marker |

## What lives where

* The hook command: built by `buildHookCommand()` in `lib/sync.js`
* The marker: `HOOK_MARKER` constant in `lib/sync.js`
* Installation: `writeClaudeSettings()` in `lib/installer.js`
* Refresh on each sync: `ensureSessionStartHook()` in `lib/sync.js`
* OpenCode counterpart: same `ensureSessionStartHook` walks both `.claude` and `.opencode` settings paths
