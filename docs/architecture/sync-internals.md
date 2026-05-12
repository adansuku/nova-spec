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
| `previousShippedHash` exists AND `currentHash == previousShippedHash` | User hasn't touched it since last sync. Overwrite. Record `newStockHash`. |
| `previousShippedHash` exists AND `currentHash != previousShippedHash` | User edited it. **Skip.** Keep `previousShippedHash` in manifest. |
| `previousShippedHash` is **missing** (corrupt / deleted manifest, file added by user) | **Skip — conservative mode.** Treat as user-owned. |

For files that were **removed upstream** (in old manifest but not in new package):

| Condition | Action |
|---|---|
| File doesn't exist on disk | Drop from manifest. |
| `currentHash == previousShippedHash` | User didn't touch it. Delete. |
| `currentHash != previousShippedHash` | User edited it. **Keep.** Warn. |

That's it. Seven cases, two layers (existing files + removed files).

### Conservative mode in detail

When the manifest entry for a file is missing (the file exists on disk but
nothing in `.nova-manifest.json` mentions it), sync cannot tell whether the
content is a user-created file or a stale upstream-shipped file. It refuses
to overwrite, preserving the disk content. This kicks in when:

- The user deleted `.nova-manifest.json` (e.g. to "force a clean resync").
- The manifest was corrupted (`readManifest` backed it up and replaced it
  with an empty `{ files: {} }`).
- A merge conflict on the manifest was resolved to "delete".
- The file was added by the user manually and shares a name with something
  upstream later shipped.

The reporting tag is the same `⚠ NOT updated (you have local edits)` —
indistinguishable from a "real" edit at sync time. Recovery: pick `[R]
Replace with the package version` via `/nova-diff <path>` for each file
the user wants reset.

## The implementation

`lib/sync.js` exports `sync(destDir)` which orchestrates the flow:

```text
1. readManifest()                      ← load last-shipped hashes; corrupt JSON
                                         is backed up to .corrupt.<ts> and the
                                         function returns an empty manifest
                                         (kicks conservative mode below)
2. collectPackageFiles(packageRoot)    ← walk the npm package's novaspec/ + framework files
3. migrateConfig(configPath)           ← idempotent yaml migrations BEFORE
                                         touching state, so a migration crash
                                         can't leave a stale manifest
4. for each (relPath, srcAbs) in package files:
       resolve currentHash, previousShippedHash, newStockHash
       apply the decision matrix (conservative mode skips when manifest is missing)
5. for each relPath in old manifest but not in new sources:
       check if removed-upstream rules say keep / delete
6. writeManifest()                     ← writeAtomic (tmp + rename). For
                                         skipped files, KEEP old hash so future
                                         syncs still see them as edited.
7. refreshRuntimeLinks(destDir)        ← re-link .claude/{commands,skills,agents}
                                         if a Windows install fell back to copies
8. ensureSessionStartHook(destDir)     ← refresh hook + dedupe legacy hooks
                                         (any `npx nova-spec[@<tag>] sync` entry
                                         is replaced with one canonical)
9. printReport()                       ← +new / ↻updated / ⚠skipped / −removed
```

Every state-modifying write goes through `writeAtomic(path, content)` —
write to `<path>.tmp.<pid>.<timestamp>`, then `renameSync`. So a SIGKILL
or disk-full mid-write never leaves a half-written manifest or
`settings.local.json`.

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
