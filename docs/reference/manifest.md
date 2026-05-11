---
description: What .nova-manifest.json is, how it's used, and why you can ignore it.
---

# .nova-manifest.json

A small JSON file at `novaspec/.nova-manifest.json` that tracks **what nova-spec last shipped to your project**. Sync uses it to detect your local edits via hash-compare.

You don't edit it. It's regenerated on every `init` and `sync`.

## Shape

```json
{
  "version": "1.0.3",
  "generated_at": "2026-05-10T12:34:56.789Z",
  "files": {
    "novaspec/commands/nova-start.md": "5b3c1a...sha256...",
    "novaspec/templates/pr-body.md": "f29e7b...sha256...",
    "novaspec/guardrails/proposal-closed.sh": "a80c12...sha256...",
    "AGENTS.md": "e3417d...sha256..."
  }
}
```

| Field | Purpose |
|---|---|
| `version` | nova-spec version that wrote this manifest |
| `generated_at` | ISO timestamp; informational |
| `files` | Map of `<rel-path>` → SHA-256 of the file as we shipped it |

## What gets tracked

Everything inside `novaspec/` plus `AGENTS.md` and `CLAUDE.md` at the top level. Two intentional exceptions:

* `novaspec/config.yml` — your config, never tracked
* `novaspec/.nova-manifest.json` — the manifest itself

## How sync uses it

For each framework file shipped by the new package:

```text
newStockHash       = SHA-256 of the file in the installed package
currentHash        = SHA-256 of the file on the consumer's disk
previousShippedHash = manifest.files[path]   (what we last shipped)

if  file doesn't exist on disk          → copy. record newStockHash.
if  currentHash == newStockHash         → no-op (already up to date).
if  currentHash == previousShippedHash  → consumer didn't touch it, safe to overwrite.
                                          copy. record newStockHash.
otherwise                                → consumer modified it. SKIP.
                                          keep previousShippedHash so future
                                          syncs still detect modification.
```

For files that were removed upstream (in `manifest.files` but not in the new package):

```text
if  file doesn't exist on disk      → already gone, drop from manifest.
if  currentHash == manifest hash    → safe to delete (consumer didn't edit it).
otherwise                            → keep + warn (consumer's edits survive).
```

See [Architecture → Sync internals](../architecture/sync-internals.md) for the algorithm in code.

## Why it's gitignored

Two reasons:

1. **Personal-state**. Each developer's manifest reflects what they last synced. If two developers are on different versions, their manifests differ — committing it would create churn.
2. **Auto-regenerated**. Running `init` or `sync` rebuilds it. Nothing depends on the file being committed.

If you ever delete `.nova-manifest.json`, the next sync treats every file as "no previous shipped hash" — meaning if `currentHash != newStockHash`, it'll be skipped (treated as user-modified). Slightly conservative but never destructive.

## Reading it manually

If you want to know which files have local edits, the manifest doesn't tell you directly — it only knows the last-shipped hashes. To check yourself:

```bash
# Are my AGENTS.md edits still there?
sha256sum AGENTS.md
jq -r '.files["AGENTS.md"]' novaspec/.nova-manifest.json
# If the values differ, your file has been edited since last shipped.
```

But the easier answer is: run `npx nova-spec sync` and read the report.

## When the schema changes

The manifest format is itself versioned via the `version` field. If a future nova-spec changes the shape, sync handles the migration: reads the old shape, applies edits with as much information as it has, writes the new shape.

There's no schema versioning beyond `version` — it's intentionally minimal. If you ever see a `manifest schema unknown` error, your installed package is older than the manifest. Run `npx nova-spec@latest sync`.

## What's NOT in it

* No telemetry. No identifiers. No machine info. Just `<rel-path>` → SHA-256.
* No full-content snapshots. Hashes only.
* No per-section grouping. Flat dict — every file is equal.
