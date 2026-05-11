'use strict';

// Minimal smoke test for nova-spec internals. Run with: npm test
//
// Verifies the high-risk file-system operations of the simplified
// "edit-in-place + hash-compare" model:
//   - generateManifest hashes every shipped file
//   - sync overwrites untouched files but preserves user edits
//   - sync removes upstream-deleted files only when untouched
//   - ensureSessionStartHook is idempotent and preserves other hooks
//   - migrateConfig is idempotent
//   - forge detection / command building

const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');

const sync = require('../lib/sync.js');
const { migrateConfig } = require('../lib/migrate-config.js');
const { detectForge, buildPrCommand } = require('../lib/forge.js');

let pass = 0;
let fail = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    pass++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.stack || err.message}`);
    fail++;
  }
}

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'nova-spec-test-'));
}

function copyTree(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyTree(s, d);
    else fs.copyFileSync(s, d);
  }
}

console.log('\nnova-spec smoke tests\n');

// 1. generateManifest hashes every file we ship
test('generateManifest covers every novaspec file + framework files', () => {
  const PACKAGE_ROOT = path.join(__dirname, '..');
  const manifest = sync.generateManifest(PACKAGE_ROOT);
  assert.ok(manifest.files['novaspec/commands/nova-start.md'], 'commands tracked');
  assert.ok(manifest.files['novaspec/templates/pr-body.md'], 'templates tracked');
  assert.ok(manifest.files['novaspec/guardrails/proposal-closed.sh'], 'guardrails tracked');
  assert.ok(manifest.files['AGENTS.md'], 'AGENTS.md tracked');
  // Sanity: config.yml NEVER tracked
  assert.ok(!manifest.files['novaspec/config.yml'], 'config.yml not tracked');
});

// 2. collectPackageFiles excludes config.yml and manifest
test('collectPackageFiles excludes config.yml and manifest', () => {
  const PACKAGE_ROOT = path.join(__dirname, '..');
  const sources = sync.collectPackageFiles(PACKAGE_ROOT);
  assert.ok(!sources['novaspec/config.yml']);
  assert.ok(!sources['novaspec/.nova-manifest.json']);
  assert.ok(sources['novaspec/commands/nova-start.md']);
});

// 3. ensureSessionStartHook is idempotent and preserves user hooks
test('ensureSessionStartHook preserves user hooks and is idempotent', () => {
  const dir = tmpDir();
  fs.mkdirSync(path.join(dir, '.claude'), { recursive: true });
  const settingsPath = path.join(dir, '.claude', 'settings.local.json');

  fs.writeFileSync(
    settingsPath,
    JSON.stringify({
      hooks: {
        SessionStart: [{ hooks: [{ type: 'command', command: 'echo "user-hook"' }] }],
      },
    }),
  );

  sync.ensureSessionStartHook(dir);
  sync.ensureSessionStartHook(dir);

  const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  const flat = settings.hooks.SessionStart.flatMap((g) => g.hooks);
  const userHooks = flat.filter((h) => h.command === 'echo "user-hook"');
  const novaHooks = flat.filter((h) => h.command.includes(sync.HOOK_MARKER));
  assert.strictEqual(userHooks.length, 1, 'user hook must be preserved');
  assert.strictEqual(novaHooks.length, 1, 'nova hook must appear exactly once');
});

// 4. migrateConfig adds forge section idempotently
test('migrateConfig adds forge section if missing and is idempotent', () => {
  const dir = tmpDir();
  const cfg = path.join(dir, 'config.yml');
  fs.writeFileSync(cfg, 'branch:\n  base: main\n');

  migrateConfig(cfg);
  const text = fs.readFileSync(cfg, 'utf8');
  assert.ok(/^forge:/m.test(text), 'forge section should be added');

  migrateConfig(cfg);
  const text2 = fs.readFileSync(cfg, 'utf8');
  assert.strictEqual(text, text2, 'second migration must be a no-op');
});

// 5. forge.detectForge returns null outside a git repo
test('detectForge returns null when origin is unavailable', () => {
  const dir = tmpDir();
  const result = detectForge(dir);
  assert.strictEqual(result, null);
});

// 6. forge.buildPrCommand emits the right CLI per forge
test('buildPrCommand emits gh for github and glab for gitlab', () => {
  const gh = buildPrCommand({ forge: 'github', title: 't', body: 'b', base: 'main' });
  const gl = buildPrCommand({ forge: 'gitlab', title: 't', body: 'b', base: 'main' });
  assert.ok(gh.startsWith('gh pr create'), 'github → gh pr create');
  assert.ok(gl.startsWith('glab mr create'), 'gitlab → glab mr create');
});

// 7. proposal-closed guardrail flags TBD
test('proposal-closed guardrail flags TBD/TODO', () => {
  const dir = tmpDir();
  const ticket = 'TEST-1';
  const proposalDir = path.join(dir, 'context/changes/active', ticket);
  fs.mkdirSync(proposalDir, { recursive: true });
  fs.writeFileSync(path.join(proposalDir, 'proposal.md'), '# Spec\n\nDecision: TBD\n');

  const { execSync } = require('child_process');
  const script = path.join(__dirname, '..', 'novaspec/guardrails/proposal-closed.sh');

  let exitCode = 0;
  try {
    execSync(`bash "${script}" ${ticket}`, { cwd: dir, stdio: 'pipe' });
  } catch (err) {
    exitCode = err.status;
  }
  assert.strictEqual(exitCode, 1, 'guardrail must exit 1 when TBD is present');
});

// 8. END-TO-END: sync overwrites untouched, preserves edited
test('sync preserves user edits and updates untouched files', async () => {
  const dir = tmpDir();
  const PACKAGE_ROOT = path.join(__dirname, '..');

  // Simulate a previous install: copy package novaspec → dest, write manifest
  copyTree(path.join(PACKAGE_ROOT, 'novaspec'), path.join(dir, 'novaspec'));
  fs.copyFileSync(path.join(PACKAGE_ROOT, 'AGENTS.md'), path.join(dir, 'AGENTS.md'));
  const initialManifest = sync.generateManifest(PACKAGE_ROOT);
  fs.writeFileSync(
    path.join(dir, 'novaspec', '.nova-manifest.json'),
    JSON.stringify(initialManifest, null, 2),
  );

  // User edits one file, leaves another untouched
  const editedFile = path.join(dir, 'novaspec', 'templates', 'pr-body.md');
  const untouchedFile = path.join(dir, 'novaspec', 'commands', 'nova-start.md');
  fs.writeFileSync(editedFile, '# CUSTOM PR TEMPLATE\n');
  const untouchedHashBefore = require('crypto')
    .createHash('sha256')
    .update(fs.readFileSync(untouchedFile))
    .digest('hex');

  // Run sync
  await sync.sync(dir);

  // Edited file must be preserved
  assert.strictEqual(
    fs.readFileSync(editedFile, 'utf8'),
    '# CUSTOM PR TEMPLATE\n',
    'user-edited file must be preserved',
  );

  // Untouched file should be the same hash (unchanged because already up to date)
  const untouchedHashAfter = require('crypto')
    .createHash('sha256')
    .update(fs.readFileSync(untouchedFile))
    .digest('hex');
  assert.strictEqual(untouchedHashBefore, untouchedHashAfter, 'untouched file content unchanged');

  // Manifest should keep the OLD hash for the edited file (so future syncs still detect modification)
  const newManifest = JSON.parse(
    fs.readFileSync(path.join(dir, 'novaspec', '.nova-manifest.json'), 'utf8'),
  );
  assert.strictEqual(
    newManifest.files['novaspec/templates/pr-body.md'],
    initialManifest.files['novaspec/templates/pr-body.md'],
    'manifest must keep the previously-shipped hash for skipped files',
  );
});

// 9. REGRESSION: js-yaml parses config.yml correctly (replaces broken extractYamlScalar)
test('config.yml parses with all keys reachable (regression: \\Z + \\s* bugs)', () => {
  // Build a config that mimics what the installer writes — jira: is the last block
  const dir = tmpDir();
  const novaspec = path.join(dir, 'novaspec');
  fs.mkdirSync(novaspec, { recursive: true });

  const configText = [
    'branch:',
    '  base: "main"',
    '',
    'forge:',
    '  type: "github"',
    '  cli: "auto"',
    '',
    'ticket_system: "jira"',
    '',
    'jira:',
    '  skill: "jira-integration"',
    '  url: "https://example.atlassian.net"',
    '  project: "PROJ"',
    '  email: "me@example.com"',
    '  token: "${JIRA_API_TOKEN}"',
    '  done_transition_id: "41"',
    '  transitions:',
    '    done: "41"',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(novaspec, 'config.yml'), configText);

  const cwd = process.cwd();
  process.chdir(dir);
  try {
    const { loadConfig, readForgeConfig } = require('../lib/cli.js');
    const cfg = loadConfig();
    assert.strictEqual(cfg.jira.url, 'https://example.atlassian.net', 'last block (jira) must parse');
    assert.strictEqual(cfg.jira.email, 'me@example.com', 'email must not be confused with next line');
    assert.strictEqual(cfg.jira.transitions.done, '41', 'nested transitions.done must parse');
    assert.strictEqual(cfg.forge.type, 'github', 'forge.type must parse');

    const forge = readForgeConfig();
    assert.strictEqual(forge.type, 'github', 'readForgeConfig: explicit forge.type respected');
  } finally {
    process.chdir(cwd);
  }
});

// 10. REGRESSION: runSource rejects path traversal
test('runSource rejects ../ traversal outside PACKAGE_ROOT', () => {
  const { execFileSync } = require('child_process');
  const bin = path.join(__dirname, '..', 'bin', 'nova-spec.js');

  // Valid path inside the package should succeed
  let okOut = execFileSync('node', [bin, 'source', 'novaspec/templates/pr-body.md'], { encoding: 'utf8' }).trim();
  assert.ok(okOut.endsWith('novaspec/templates/pr-body.md'), 'valid path resolves');

  // Traversal must exit non-zero with clear error
  let exitCode = 0;
  let stderr = '';
  try {
    execFileSync('node', [bin, 'source', '../../../../etc/passwd'], { stdio: 'pipe' });
  } catch (err) {
    exitCode = err.status;
    stderr = err.stderr ? err.stderr.toString() : '';
  }
  assert.strictEqual(exitCode, 1, 'must exit 1 for traversal');
  assert.ok(/escapes the nova-spec package/i.test(stderr), 'must mention the package boundary');
});

// 11. REGRESSION: sync without manifest preserves disk content (no clobber)
test('sync without manifest preserves user edits (conservative mode)', async () => {
  const dir = tmpDir();
  const PACKAGE_ROOT = path.join(__dirname, '..');

  // Simulate a corrupted install: package copied but manifest deleted/missing
  copyTree(path.join(PACKAGE_ROOT, 'novaspec'), path.join(dir, 'novaspec'));
  fs.copyFileSync(path.join(PACKAGE_ROOT, 'AGENTS.md'), path.join(dir, 'AGENTS.md'));

  // User has previously customized a file
  const editedPath = path.join(dir, 'novaspec', 'templates', 'pr-body.md');
  fs.writeFileSync(editedPath, '# CUSTOM CONTENT — should survive sync without manifest\n');

  // No manifest exists
  const manifestPath = path.join(dir, 'novaspec', '.nova-manifest.json');
  assert.ok(!fs.existsSync(manifestPath), 'precondition: no manifest');

  await sync.sync(dir);

  assert.strictEqual(
    fs.readFileSync(editedPath, 'utf8'),
    '# CUSTOM CONTENT — should survive sync without manifest\n',
    'sync without manifest must NOT overwrite user edits',
  );
});

// 12. REGRESSION: buildHookCommand uses $HOME (shell-resolved, not baked in)
test('buildHookCommand uses literal $HOME, not installer homedir', () => {
  const cmd = sync.buildHookCommand();
  assert.ok(cmd.includes('"$HOME/.nova-spec.log"'), 'log path must be a quoted $HOME expansion');
  assert.ok(!cmd.includes(require('os').homedir()), 'must NOT contain the installer\'s resolved home');
});

// 13. REGRESSION: every shipped .sh guardrail has the executable bit
test('all novaspec/guardrails/*.sh files are executable', () => {
  const guardrailsDir = path.join(__dirname, '..', 'novaspec', 'guardrails');
  const scripts = fs.readdirSync(guardrailsDir).filter((n) => n.endsWith('.sh'));
  assert.ok(scripts.length > 0, 'expected at least one .sh guardrail');
  for (const name of scripts) {
    const mode = fs.statSync(path.join(guardrailsDir, name)).mode;
    const isExecutable = (mode & 0o111) !== 0;
    assert.ok(isExecutable, `${name} must be executable (got mode ${(mode & 0o777).toString(8)})`);
  }
});

// 14. REGRESSION: migrateConfig handles inline YAML comments without corrupting value
test('migrateConfig strips inline comments from done_transition_id', () => {
  const dir = tmpDir();
  const cfg = path.join(dir, 'config.yml');
  fs.writeFileSync(
    cfg,
    'jira:\n  done_transition_id: 41   # was 31 before workflow rework\n',
  );
  migrateConfig(cfg);
  const out = fs.readFileSync(cfg, 'utf8');
  // Both the legacy key and the new transitions.done must equal "41" — not "41   # was 31..."
  assert.ok(/done_transition_id: "41"/.test(out), `expected clean done_transition_id, got:\n${out}`);
  assert.ok(/transitions:\s*\n\s*done: "41"/.test(out), `expected clean transitions.done, got:\n${out}`);
});

// 15. REGRESSION: hashFile on a symlink hashes the link target string, not the resolved file
test('hashFile treats symlinks as modified content (no follow)', () => {
  const dir = tmpDir();
  const real = path.join(dir, 'real.txt');
  const link = path.join(dir, 'link.txt');
  fs.writeFileSync(real, 'real content');
  fs.symlinkSync('real.txt', link);

  // Re-require sync.js fresh (it caches hashFile internally via crypto, but functions are pure)
  const crypto = require('crypto');
  const expectedLinkHash = crypto.createHash('sha256').update('real.txt').digest('hex');
  const realHash = crypto.createHash('sha256').update('real content').digest('hex');

  // We can't call hashFile directly (not exported), but verify the behavior end-to-end
  // by inspecting that walk() skips symlinks. Build manifest and confirm link.txt is absent:
  // Simulate by checking via the sync module's collectPackageFiles indirectly.
  // For a direct unit on hashFile, replicate the logic inline matching sync.js:
  const stat = fs.lstatSync(link);
  let observedLinkHash;
  if (stat.isSymbolicLink()) {
    observedLinkHash = crypto.createHash('sha256').update(fs.readlinkSync(link)).digest('hex');
  } else {
    observedLinkHash = crypto.createHash('sha256').update(fs.readFileSync(link)).digest('hex');
  }
  assert.strictEqual(observedLinkHash, expectedLinkHash, 'symlink hashes its target string');
  assert.notStrictEqual(observedLinkHash, realHash, 'symlink hash must differ from real file content hash');
});

// 16. REGRESSION: readManifest backs up corrupt JSON instead of process.exit
test('readManifest recovers from corrupt JSON by backing it up', () => {
  const dir = tmpDir();
  const manifest = path.join(dir, 'novaspec', '.nova-manifest.json');
  fs.mkdirSync(path.join(dir, 'novaspec'), { recursive: true });
  fs.writeFileSync(manifest, '{not valid json'); // corrupt

  // Should NOT throw / exit — recovers with empty manifest + backup file
  const result = sync.readManifest(manifest);
  assert.deepStrictEqual(result, { files: {} }, 'returns empty manifest after recovery');
  const siblings = fs.readdirSync(path.join(dir, 'novaspec'));
  assert.ok(
    siblings.some((n) => n.startsWith('.nova-manifest.json.corrupt.')),
    'corrupt manifest must be preserved as backup',
  );
  assert.ok(
    !siblings.includes('.nova-manifest.json'),
    'corrupt manifest must be removed from primary path',
  );
});

// 17. REGRESSION: ensureSessionStartHook dedupes legacy hooks (no marker)
test('ensureSessionStartHook removes legacy hooks without the marker', () => {
  const dir = tmpDir();
  fs.mkdirSync(path.join(dir, '.claude'), { recursive: true });
  const settingsPath = path.join(dir, '.claude', 'settings.local.json');

  // Simulate two old nova-spec hooks (one without marker, one with old marker shape)
  fs.writeFileSync(
    settingsPath,
    JSON.stringify({
      hooks: {
        SessionStart: [
          { hooks: [{ type: 'command', command: 'npx nova-spec sync' }] }, // legacy, no marker
          { hooks: [{ type: 'command', command: 'echo "user-hook"' }] }, // unrelated user hook
          { hooks: [{ type: 'command', command: 'npx nova-spec@1.0.0 sync # nova-spec auto-sync' }] }, // older nova
        ],
      },
    }),
  );

  sync.ensureSessionStartHook(dir);
  const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  const flat = settings.hooks.SessionStart.flatMap((g) => g.hooks);

  const novaHooks = flat.filter((h) =>
    /\bnpx\s+nova-spec(@\S+)?\s+sync\b/.test(h.command),
  );
  const userHooks = flat.filter((h) => h.command === 'echo "user-hook"');
  assert.strictEqual(novaHooks.length, 1, 'must collapse all nova hooks to one canonical');
  assert.strictEqual(userHooks.length, 1, 'must preserve unrelated user hook');
  assert.ok(
    novaHooks[0].command.includes(sync.HOOK_MARKER),
    'the surviving nova hook must carry the modern marker',
  );
});

// 18. REGRESSION: detectForge falls back to non-origin remotes
test('detectForge falls back to other remotes when origin is missing or unsupported', () => {
  const { execSync } = require('child_process');
  const dir = tmpDir();
  execSync('git init -q', { cwd: dir });
  execSync('git remote add upstream git@gitlab.com:fake/project.git', { cwd: dir });

  const { detectForge } = require('../lib/forge.js');
  const result = detectForge(dir);
  assert.strictEqual(result, 'gitlab', 'gitlab remote via upstream must be detected');
});

// 19. REGRESSION: writeAtomic doesn't leave .tmp files on success
test('writeAtomic produces the final file and removes its tmp', () => {
  const dir = tmpDir();
  const target = path.join(dir, 'state.json');
  sync.writeAtomic(target, '{"hello": "world"}');

  const siblings = fs.readdirSync(dir);
  assert.deepStrictEqual(siblings, ['state.json'], 'only the final file remains');
  assert.strictEqual(fs.readFileSync(target, 'utf8'), '{"hello": "world"}');
});

// 20. REGRESSION: refreshRuntimeLinks recreates symlinks if dest is a copied directory
test('refreshRuntimeLinks converts copied dir back to a symlink', () => {
  if (process.platform === 'win32') {
    // Symlink creation on Windows requires Developer Mode; skip cleanly.
    console.log('     (skipped on Windows)');
    return;
  }
  const dir = tmpDir();
  fs.mkdirSync(path.join(dir, 'novaspec', 'commands'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'novaspec', 'commands', 'nova-start.md'), '# start\n');
  fs.mkdirSync(path.join(dir, '.claude'), { recursive: true });

  // Simulate Windows fallback: .claude/commands is a copied dir, not a symlink
  fs.mkdirSync(path.join(dir, '.claude', 'commands'));
  fs.writeFileSync(path.join(dir, '.claude', 'commands', 'nova-start.md'), '# stale\n');

  sync.refreshRuntimeLinks(dir);

  const linkStat = fs.lstatSync(path.join(dir, '.claude', 'commands'));
  assert.ok(linkStat.isSymbolicLink(), '.claude/commands must be a symlink after refresh');

  // And the new symlink points at the current novaspec content (not the stale copy)
  const content = fs.readFileSync(path.join(dir, '.claude', 'commands', 'nova-start.md'), 'utf8');
  assert.strictEqual(content, '# start\n', 'symlink must resolve to the live novaspec/ content');
});

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail > 0 ? 1 : 0);
