---
description: How npx nova-spec sync detects local edits and updates everything else.
---

# Sync internals

The "edit-in-place" customization model relies on one mechanism: **per-file SHA-256 hash compare against a manifest of last-shipped hashes**. Everything else is plumbing.

## The decision matrix

For every file in the new package shipment:

| Condition | Action |
|---|---|
| File doesn't exist on disk | Create it. Record `newStockHash` in manifest. |
| `currentHash == newStockHash` | No-op. Already up to date. |
| `currentHash == previousShippedHash` | User hasn't touched it since last sync. Overwrite. Record `newStockHash`. |
| `currentHash != previousShippedHash` | User edited it. **Skip.** Keep `previousShippedHash` in manifest. |

For files that were **removed upstream** (in old manifest but not in new package):

| Condition | Action |
|---|---|
| File doesn't exist on disk | Drop from manifest. |
| `currentHash == previousShippedHash` | User didn't touch it. Delete. |
| `currentHash != previousShippedHash` | User edited it. **Keep.** Warn. |

That's it. Six cases, two layers (existing files + removed files).

## The implementation

`lib/sync.js` exports `sync(destDir)` which orchestrates the flow:

```text
1. readManifest()                      ← load last-shipped hashes from disk
2. collectPackageFiles(packageRoot)    ← walk the npm package's novaspec/ + framework files
3. for each (relPath, srcAbs) in package files:
       resolve currentHash, previousShippedHash, newStockHash
       apply the decision matrix
4. for each relPath in old manifest but not in new sources:
       check if removed-upstream rules say keep / delete
5. writeManifest()                     ← regenerate. For skipped files, KEEP old hash.
6. migrateConfig(configPath)           ← idempotent yaml migrations
7. ensureSessionStartHook(destDir)     ← refresh hook command if changed
8. printReport()                       ← +new / ↻updated / ⚠skipped / −removed
```

## Why "keep old hash for skipped files"

It's the subtle part. After a sync that skipped a file:

* `currentHash` (on disk) = the user's edited version
* `newStockHash` (just shipped) = the new package version
* `previousShippedHash` (old manifest) = what we shipped *before* the user edited

If we overwrote the manifest with `newStockHash` for skipped files, then on the **next** sync — even before the user touches the file again — `currentHash != previousShippedHash` would still be true, but for a different reason. Worse: if the package shipped the user's exact bytes by coincidence, we'd think they reverted.

By keeping `previousShippedHash` for skipped files, we preserve the invariant: **manifest tracks "what we last successfully delivered to this user"**. Until we successfully deliver the new version, we keep the old one as the reference.

## What gets walked

`collectPackageFiles(packageRoot)` returns a flat map of `<relPath>` → `<absSrcPath>` covering:

* Everything inside the package's `novaspec/` (recursively)
* Top-level framework files: `AGENTS.md`, `CLAUDE.md`

Always excluded:

* `novaspec/config.yml`
* `novaspec/.nova-manifest.json`
* `.gitkeep` files
* Symlinks (skipped — never followed)
* `node_modules/`

## Hash function

SHA-256. Why not MD5 (which the old design used):

* SHA-256 is barely slower for files this small
* No security claim either way (the manifest isn't used for tamper detection), but SHA-256 is the saner default in 2026 codebases
* Better collision resistance — irrelevant in practice but cleaner

## Migrations

After applying file updates, `migrateConfig(configPath)` runs idempotent text-level migrations on `config.yml`. Each migration has a `detect` function (heuristic) and an `apply` function. Current ones:

| Migration | Trigger | Effect |
|---|---|---|
| `add-forge-section` | No `forge:` block exists | Appends `forge:` with `type: auto`, `cli: auto` |
| `rename-done-transition-id` | `done_transition_id` present, no `transitions:` | Adds `transitions.done` mirror, keeps legacy key |

Idempotency is by detection: if the migration's `detect` returns false (already applied), `apply` doesn't run. Running sync 100 times produces the same `config.yml` as running once.

## SessionStart hook refresh

After file updates, `ensureSessionStartHook(destDir)` ensures the hook in `.claude/settings.local.json` (and `.opencode/settings.local.json` if present) matches the current expected command. Identification is by a marker in the command string:

```bash
npx nova-spec@latest sync >> ~/.nova-spec.log 2>&1 || true # nova-spec auto-sync
```

The `# nova-spec auto-sync` substring is the marker. Any hook in the array containing it is treated as ours. Other hooks (yours, your team's) are preserved untouched.

If the marker is found but the command differs (e.g. we changed the log path), it's replaced. If not found, a new hook is appended. Idempotent.

## Atomicity

Sync is **not** transactional. If it fails mid-file (disk full, network drop downloading the package), you can be left with a partial mix of old and new files. Recovery: re-run sync. The manifest still reflects the previously-successful state, so the run picks up where it left off.

There's no rollback. The simplest mental model: each successful sync is a fixed point; an interrupted sync is somewhere between two fixed points. Re-running converges.

## Why this is simpler than the old `custom/` model

The previous design used:

* `novaspec/<section>/` (core, npm-shipped)
* `novaspec/custom/<section>/` (user overrides)
* `novaspec/.resolved/<section>/` (built layer where custom wins)
* `outdated_customs` array in the manifest

Three concepts to learn, three indirection paths every command had to know about, and an `outdated_customs` semantics that confused even me.

The new model:

* You edit in place.
* Sync hash-compares.
* Edits are preserved.

End of mental model. The code dropped from ~600 lines to ~250.

## Files involved

| File | Role |
|---|---|
| `lib/sync.js` | Algorithm |
| `lib/migrate-config.js` | Versioned config migrations |
| `lib/installer.js` | Initial install — also writes manifest, runs same hook setup |
| `novaspec/.nova-manifest.json` | The state |

## Tests

`test/smoke.test.js` includes an end-to-end test that:

1. Copies the package's novaspec/ to a tmp dir
2. Edits one file (simulating user customization)
3. Runs `sync()`
4. Asserts the edited file is preserved
5. Asserts the manifest still records the old shipped hash for that file

If you change the algorithm, run `npm test` first.
