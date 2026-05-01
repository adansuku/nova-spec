---
description: Bootstrap context/services/ in an existing repo — generate drafts with TODOs
argument-hint:
---

You are a **read-only on the tree + write drafts** command.
You don't modify code. You don't touch `context/decisions/`. You don't commit or PR.
Your only job is to heuristically scan the repo and generate drafts of
`context/services/project.md` and `context/services/<svc>.md` so the
human can refine them before the first `/nova-start`.

## Preconditions

Before any scan, validate in order:

1. **`context/` exists** in the destination repo (`$PWD/context/`). If not, abort with:

   ```
   ✗ context/ does not exist in this repo. Run install.sh before /nova-init.
   ```

2. **You are not inside the `nova-spec` source repo**. If `$PWD` contains
   `novaspec/commands/nova-start.md` (i.e., the source repo), abort with:

   ```
   ✗ I cannot run inside the nova-spec source repo.
     Use /nova-init in a repo where nova-spec is INSTALLED, not the source.
   ```

3. **Working tree**: not strict, but warn if there are uncommitted changes:

   ```
   ⚠ Working tree dirty. Drafts will still be created; check them with
     git status to keep them separate from in-progress changes.
   ```

## Step 1 — Scan the root

Detect language/stack markers in `$PWD` (top-level only, no recursion):

| Marker | Toolchain |
|---|---|
| `package.json` | Node.js |
| `pyproject.toml` | Python |
| `go.mod` | Go |
| `Gemfile` | Ruby |
| `Cargo.toml` | Rust |
| `composer.json` | PHP |

Command: `ls $PWD | grep -E '^(package\.json|pyproject\.toml|go\.mod|Gemfile|Cargo\.toml|composer\.json)$'`.

If `package.json` exists at the root, extract the `scripts` section (jq or manual parse).
If `Makefile` exists at the root, extract targets with `grep -E '^[a-zA-Z][a-zA-Z0-9_-]*:' Makefile | head -20`.

Save the combined list as `{{DETECTED_COMMANDS}}` to substitute in the template.

## Step 2 — Detect services

For each conventional directory `services/`, `apps/`, `packages/`:
- If it exists, list its subdirs (`ls $PWD/<dir>` without deep recursion).
- For each subdir, look for the same markers as Step 1.
- If at least one marker matches, the subdir is a **detected service**.
  Record: name (subdir name), path, toolchain, manifest.

**Don't scan** outside those 3 conventional directories.

## Step 3 — Prepare drafts in memory

For **project.md**:
- Read `novaspec/templates/init-project.md`.
- Substitute `{{DETECTED_COMMANDS}}` with the Step 1 list (bullets
  `- npm run <script>` or `- make <target>`). If empty, put `[TODO: add useful project commands]`.
- The rest of the TODOs stay as-is.

For each detected service, prepare **`<name>.md`**:
- Read `novaspec/templates/init-service.md`.
- Substitute `{{SERVICE_NAME}}`, `{{MANIFEST}}` (path to detected manifest),
  `{{TOOLCHAIN}}` (e.g. `Node.js (package.json)`), `{{DATE}}` (today's date YYYY-MM-DD).

## Step 4 — Apply idempotency

For each file to write under `context/services/`:
- If it **doesn't exist** → write with the intended name (`project.md`, `<svc>.md`).
- If it **already exists** → write `<basename>.draft.md` (e.g. `project.draft.md`).
  If `.draft.md` also exists, add a numeric suffix `.draft-2.md`, `.draft-3.md`, etc.

Never overwrite.

## Step 5 — Human checkpoint

Before writing anything to disk, present:

```
I'm going to create these files in context/services/:

  - project.md                (new)
  - <svc1>.md                 (new)
  - <svc2>.md                 (new)

Preview of project.md (first 20 lines):
<snippet>

Preview of <svc1>.md (first 20 lines):
<snippet>

Continue? [y/N]
```

If the user replies anything other than `y` / `Y` / `yes`, abort without writing.

## Step 6 — Write and summarize

After `y`, write the files. Then show:

```
✓ Created N files in context/services/:
  - project.md
  - <svc>.md (xN)

Pending to fill (look for TODO in the files):
  - Target architecture
  - Testing policy
  - Constraints
  - Relevant decisions per service

Next step: edit the TODOs and then run /nova-start <TICKET>.
```

## Rules

- **Read-only on the repo tree**; you only write under `context/services/`.
- **Don't create files in `context/decisions/`** under any circumstance (only suggest as bullets in `project.md`).
- **Don't run `git add/commit/push`**; that belongs to `/nova-wrap` of the first ticket.
- **Don't scan outside** root + `services/|apps/|packages/*`.
- **Don't overwrite** existing files: use `.draft.md`.
- If you don't detect anything recognizable, the generated `project.md` should be honest — many TODOs + ask the user if they want to list services manually.
