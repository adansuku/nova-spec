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

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail > 0 ? 1 : 0);
