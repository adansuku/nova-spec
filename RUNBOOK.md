# nova-spec — Runbook

Quick reference for installing and managing nova-spec in a team. Built for live demo and day-to-day operation.

**Docs site**: https://adansuku.github.io/nova-spec/
**npm**: https://www.npmjs.com/package/nova-spec
**Repo**: https://github.com/Adansuku/nova-spec

---

## 1. Install (per developer, one-time)

```bash
# In the team's repo root
npx nova-spec init
```

Interactive wizard asks 5 things:

| Prompt | Recommended answer | Why |
|---|---|---|
| Scope | `This project only` | Lets the team share customizations via git |
| Runtime | `Claude Code` (or `Both`) | Symlinks `.claude/` to the framework |
| Ticket system | `jira` | Enables auto-fetch in `/nova-start` |
| Jira config | URL + project + email + token | Token from id.atlassian.com → ask installer to validate the "Done" transition |
| Forge | `Auto-detect from git remote` | Picks `gh` for GitHub, `glab` for GitLab |
| Base branch | `main` | New ticket branches cut from here |

The installer writes `novaspec/`, `context/` (with onboarding README scaffolding), `.claude/`, `AGENTS.md`, and a SessionStart hook that auto-updates the framework on every IDE start.

### After install on an EXISTING codebase

`context/` is empty after `init` (just READMEs explaining what each folder is for). To bootstrap the architectural memory from your existing code in one shot:

```text
/nova-seed
```

Scans `package.json`, linter configs, source structure, drafts `stack.md`, `conventions.md`, and `context/services/<svc>.md` per detected service. You approve each draft. 15-30 minutes total. Commit the result; teammates inherit it on `git pull`.

### Required environment variable

Each dev sets this once in their shell rc:

```bash
# ~/.zshrc or ~/.bashrc
export JIRA_API_TOKEN="<personal-token-from-id.atlassian.com>"
```

Get the token at https://id.atlassian.com/manage-profile/security/api-tokens. It's per-person, not shared.

### Required CLIs

- **GitHub**: `brew install gh` then `gh auth login`
- **GitLab**: `brew install glab` then `glab auth login`

---

## 2. The full flow (one screen)

```text
/nova-start TICKET   → classify, branch, load context (stack + conventions + services)
/nova-spec           → close decisions, write proposal.md
/nova-plan           → translate spec into tasks.md
/nova-build          → execute tasks one by one
/nova-review         → deterministic checks (lint/tests) + 4-axis LLM review
/nova-wrap           → memory update, archive spec, commit, PR/MR, move Jira → "Code Review"
/nova-rework         → apply reviewer feedback after PR is open (no new PR)
```

`quick-fix` tickets skip `/nova-spec` and `/nova-plan`.

**About Jira "Done"**: `/nova-wrap` moves the ticket to **Code Review**, not Done. When the PR merges, Jira's native GitHub / GitLab integration moves it to Done automatically. If your workspace doesn't have that integration, someone moves the ticket manually after merge.

Side commands:

| | What it does |
|---|---|
| `/nova-status [TICKET]` | Read-only: where is this ticket in the flow? |
| `/nova-sync` | Force-pull the latest framework version (auto runs on session start) |
| `/nova-diff <path>` | Show what changed upstream for a file you edited locally |
| `/nova-seed` | **One-time** bootstrap of `context/` from an existing codebase. Run right after `init` on repos with existing code. |

### Team-specific skill commands (Jira + GitLab)

Outside the `/nova-*` flow, two skills cover ad-hoc operations:

**Jira** — same skill the framework uses for `/nova-start` and `/nova-wrap`, also exposed for manual use:

| | What it does |
|---|---|
| `/jira show <TICKET>` | Show ticket details (formatted) |
| `/jira list` | Your open tickets |
| `/jira improve <TICKET>` | Detect quality gaps, ask 2-4 questions, update the ticket |
| `/jira comment <TICKET>` | Add a comment |

**GitLab** — rich operations beyond what `forge` covers (which is just MR creation):

| | What it does |
|---|---|
| `/gitlab create` | Create MR with the team's body template + squash + target from `branch.base` |
| `/gitlab review <ID>` | Fetch + comment + approve an MR |
| `/gitlab pipeline` | Pipeline status for current branch |
| `/gitlab list` / `my` / `assigned` | List MRs |
| `/gitlab branch <TICKET>` | Create branch from Jira ticket (alternative to `/nova-start`) |
| `/gitlab merge <ID>` | Merge with squash |

Both skills coexist with the framework's automatic flow. They use the same `JIRA_API_TOKEN` env var; GitLab uses its own `GITLAB_TOKEN` for rich ops.

---

## 3. First-day customizations (15 minutes)

Edit these files directly. Sync preserves them via hash-compare — never overwrites your edits.

### a. PR / MR template

```bash
$EDITOR novaspec/templates/pr-body.md
```

Add your team's checklist (QA, security review, screenshots, ticket link format).

### b. Code review structure

```bash
$EDITOR novaspec/templates/review.md
```

Adjust the axes `/nova-review` evaluates. Keep the literal line `✓ Ready for /nova-wrap` — that's the deterministic gate.

### c. Commit message format

```bash
$EDITOR novaspec/templates/commit.md
```

Default is conventional commits. Add your trailers / scope rules here.

### d. Stack & conventions (so the AI knows your project)

```bash
$EDITOR context/stack.md
$EDITOR context/conventions.md
```

Both files come pre-filled with HTML-comment guides. **Fill them properly** — the AI loads them on every ticket and matches your style automatically.

### e. Commit the customizations

```bash
git add novaspec/ context/stack.md context/conventions.md
git commit -m "chore: customize nova-spec for our team"
git push
```

Everyone else on the team gets the same flow after `git pull`.

---

## 4. Architectural memory (the long-term value)

Three directories under `context/` that survive tool changes and team turnover:

| Directory | What goes there |
|---|---|
| `context/decisions/` | One file per architectural decision. Filename = the concept. Example: `throttling-strategy.md` |
| `context/gotchas/` | One file per non-obvious trap. Example: `redis-key-collision.md` |
| `context/services/` | One file per service, ≤80 lines, describes the public interface |

Rules:
- **One fact = one file** (don't aggregate)
- **Filename is the index** (no numbering, no frontmatter)
- **Supersede explicitly**: new decision has `> Supersedes: <old>.md` and the old file goes to `decisions/archived/` via `git mv`

`/nova-wrap` prompts you to add these when relevant. You can also write them by hand any time.

---

## 5. Maintenance commands

```bash
# Force-update to the latest framework version
npx nova-spec sync

# Get the path to a file inside the installed package (used by /nova-diff)
npx nova-spec source novaspec/templates/pr-body.md

# Read a Jira ticket from the CLI (debug)
npx nova-spec jira get PROJ-42

# List Jira transitions for a ticket (to find the right "Done" ID)
npx nova-spec jira transitions PROJ-42

# Detect what forge the repo uses
npx nova-spec forge detect

# Print the right PR creation command for the current forge
npx nova-spec forge pr-command "<title>" "<body>" "<base>"
```

Auto-sync logs land at `~/.nova-spec.log` — first place to look when something seems off.

---

## 6. Updating to a new version

You don't. The `SessionStart` hook does it automatically:

```bash
# What runs on every Claude Code / OpenCode session start
npx nova-spec@latest sync >> "$HOME/.nova-spec.log" 2>&1 || true
```

When you publish a new nova-spec version to npm, every dev picks it up at their next IDE start. **Their local customizations are preserved** via SHA-256 hash-compare against the manifest.

Files you've edited locally are reported as `⚠ NOT updated (you have local edits)`. Run `/nova-diff <path>` to see upstream changes and decide: keep, merge manually, or replace.

---

## 7. Troubleshooting (in order of likelihood)

### `Jira returned 401 Unauthorized`
Token expired. Regenerate at id.atlassian.com → update `JIRA_API_TOKEN` in shell rc → reload.

### `Jira returned 404 for PROJ-X`
Wrong key or wrong project prefix. Verify the key opens in browser, check `novaspec/config.yml` → `jira.project`.

### `gh: command not found` / `glab: command not found`
Install the forge CLI (`brew install gh` or `brew install glab`) and authenticate.

### Slash commands don't appear in autocomplete
1. Restart Claude Code (sometimes caches the listing)
2. Check `ls -la .claude/` — `commands`, `skills`, `agents` should be symlinks pointing to `novaspec/`
3. If symlinks broken after clone: `git config core.symlinks true && git reset --hard HEAD`

### Sync says "you have local edits" but I don't remember editing
Run `/nova-diff <path>` — it shows your version vs the package version. Pick `[R] Replace` to discard your local copy and adopt upstream.

### "Proposal has open markers"
`/nova-plan` refused because `proposal.md` contains `TBD`, `TODO`, `FIXME`, `???`, or `<placeholder>`. Re-run `/nova-spec` to close them.

### Auto-sync seems not to be running
1. `cat ~/.nova-spec.log` — first place
2. `cat .claude/settings.local.json` — verify the `SessionStart` hook is there with the marker `# nova-spec auto-sync`
3. Force-run manually: `npx nova-spec@latest sync`

---

## 8. What does NOT need coordination

- Updating to a new framework version (auto-sync)
- Each dev has their own Jira token (personal)
- Forge detection (per-repo, via git remote)

## What DOES need coordination

- Changing a template that affects everyone → regular team PR
- Changing `branch.types` or `branch.base` → communicate before merging
- Adding a new guardrail → could block mid-flow

---

## 9. Likely FAQ from the team

**Q: ¿Y si no quiero usar Jira?**
A: Editar `novaspec/config.yml` → `ticket_system: none`. `/nova-start <ANYTHING>` ya no valida formato y pide los detalles a mano.

**Q: ¿Y si la red de la empresa bloquea npmjs.com?**
A: El hook hace `|| true` → no bloquea el arranque del IDE. Pero no recibirás updates. Solución: pinear a una versión local (`npm i -g nova-spec` y cambiar el hook a `npx nova-spec sync` sin `@latest`).

**Q: ¿Puedo personalizar un comando, por ejemplo `/nova-wrap`?**
A: Sí. Editas `novaspec/commands/nova-wrap.md` directamente. Sync respeta tus edits via hash-compare.

**Q: ¿Se rompe algo si dos personas tocan el mismo template a la vez?**
A: Merge conflict normal en git. No hay magia adicional — los `.md` son archivos como cualquier otro.

**Q: ¿Y los datos sensibles? ¿Se envía algo a un servidor?**
A: Cero telemetría. Cero servidor. Cero daemon. Todo vive en `git`. El único request HTTP que hace el framework es contra **vuestro** Jira y contra npmjs.com para sync.

**Q: ¿El AI agent puede leer cualquier archivo de mi disco?**
A: No vía nova-spec. `npx nova-spec source <path>` está sandboxed al paquete instalado; un `../../../etc/passwd` es rechazado.

**Q: Si quiero salirme del framework para un ticket concreto, ¿puedo?**
A: Sí. Saltas los `/nova-*` y trabajas como antes. Los guardrails no son ejecutables, son texto que sigue el agente. El control siempre lo tienes tú.

---

## 10. The 60-second elevator pitch

> nova-spec es un framework de Spec-Driven Development que añade 9 slash commands a Claude Code. Convierte un ticket de Jira en una serie de pasos explícitos: clasificar → cerrar decisiones → plan → implementar → review → cerrar. La memoria arquitectónica (decisions, gotchas, services) vive en markdown plano dentro de git — sobrevive a cualquier cambio de herramienta y al turnover del equipo. Sin servidor, sin daemon, sin DB. Lo único que necesita es Node ≥18.

---

## Cheat sheet (print this)

```text
INSTALL              npx nova-spec init
DAILY FLOW           /nova-start → /nova-spec → /nova-plan → /nova-build → /nova-review → /nova-wrap
QUICK-FIX FLOW       /nova-start → /nova-build → /nova-review → /nova-wrap
STATUS               /nova-status
FORCE UPDATE         /nova-sync  (auto on every session start)
SEE UPSTREAM CHANGE  /nova-diff <path>
CUSTOMIZE            edit novaspec/* directly, commit, push
MEMORY               context/{decisions,gotchas,services}/
TROUBLESHOOTING      tail ~/.nova-spec.log
DOCS                 https://adansuku.github.io/nova-spec/
```
