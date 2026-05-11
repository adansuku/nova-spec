'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

const MANIFEST_FILE = '.nova-manifest.json';
const HOOK_MARKER = '# nova-spec auto-sync';
const FRAMEWORK_FILES = ['AGENTS.md', 'CLAUDE.md'];
// Paths the user owns or that are auto-generated — never tracked or overwritten.
const NEVER_TRACK = new Set(['novaspec/config.yml', `novaspec/${MANIFEST_FILE}`]);

function hashFile(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function collectPackageFiles(packageRoot) {
  // Returns a flat map of relPath -> absSrcPath for every file we would ship.
  const out = {};
  const novaspec = path.join(packageRoot, 'novaspec');
  walk(novaspec, packageRoot, out);
  for (const f of FRAMEWORK_FILES) {
    const abs = path.join(packageRoot, f);
    if (fs.existsSync(abs)) out[f] = abs;
  }
  return out;
}

function walk(dir, base, out) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    if (entry.name === 'node_modules') continue;
    if (entry.name === MANIFEST_FILE) continue;
    if (entry.name === '.gitkeep') continue;

    const abs = path.join(dir, entry.name);
    const rel = path.relative(base, abs).replace(/\\/g, '/');

    if (NEVER_TRACK.has(rel)) continue;

    if (entry.isDirectory()) {
      walk(abs, base, out);
    } else if (entry.isFile()) {
      out[rel] = abs;
    }
  }
}

function generateManifest(packageRoot) {
  // Hashes everything WE ship, not what's on the consumer's disk. The manifest
  // records "what we last delivered to this user", so the next sync can detect
  // local edits via hash-compare.
  const files = {};
  const sources = collectPackageFiles(packageRoot);
  for (const [rel, abs] of Object.entries(sources)) {
    files[rel] = hashFile(abs);
  }
  return {
    version: require('../package.json').version,
    generated_at: new Date().toISOString(),
    files,
  };
}

function readManifest(manifestPath) {
  if (!fs.existsSync(manifestPath)) return { files: {} };
  try {
    const data = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    return { files: data.files || {}, version: data.version };
  } catch (err) {
    console.error(`  ✗ Could not parse ${manifestPath}: ${err.message}`);
    console.error('     Aborting sync to avoid clobbering project state.');
    process.exit(1);
  }
}

async function sync(destDir = process.cwd()) {
  const novaspecDest = path.join(destDir, 'novaspec');

  if (!fs.existsSync(novaspecDest)) {
    console.error('  ✗ nova-spec not installed in this directory. Run: npx nova-spec init');
    process.exit(1);
  }

  const PACKAGE_ROOT = path.join(__dirname, '..');
  const manifestPath = path.join(novaspecDest, MANIFEST_FILE);
  const oldManifest = readManifest(manifestPath);

  const sources = collectPackageFiles(PACKAGE_ROOT);
  const created = [];
  const updated = [];
  const skipped = [];
  const removed = [];
  const skippedRemoved = [];

  // Update / create / skip files
  for (const [rel, srcAbs] of Object.entries(sources)) {
    const destAbs = path.join(destDir, rel);
    const newStockHash = hashFile(srcAbs);

    if (!fs.existsSync(destAbs)) {
      fs.mkdirSync(path.dirname(destAbs), { recursive: true });
      fs.copyFileSync(srcAbs, destAbs);
      created.push(rel);
      continue;
    }

    const currentHash = hashFile(destAbs);
    if (currentHash === newStockHash) continue; // already up to date

    const previousShipped = oldManifest.files[rel];
    const isUntouched = !previousShipped || currentHash === previousShipped;

    if (isUntouched) {
      fs.copyFileSync(srcAbs, destAbs);
      updated.push(rel);
    } else {
      skipped.push(rel);
    }
  }

  // Detect upstream removals
  for (const rel of Object.keys(oldManifest.files)) {
    if (sources[rel]) continue; // still shipped
    const destAbs = path.join(destDir, rel);
    if (!fs.existsSync(destAbs)) continue; // already gone

    const currentHash = hashFile(destAbs);
    if (currentHash === oldManifest.files[rel]) {
      fs.unlinkSync(destAbs);
      removed.push(rel);
    } else {
      skippedRemoved.push(rel);
    }
  }

  // Build new manifest: stock hashes for everything shipped, but keep the OLD
  // hash for files we skipped (so future syncs still detect their modification).
  const newManifest = generateManifest(PACKAGE_ROOT);
  for (const rel of skipped) {
    if (oldManifest.files[rel]) newManifest.files[rel] = oldManifest.files[rel];
  }
  for (const rel of skippedRemoved) {
    if (oldManifest.files[rel]) newManifest.files[rel] = oldManifest.files[rel];
  }
  fs.writeFileSync(manifestPath, JSON.stringify(newManifest, null, 2) + '\n');

  // Migrate config.yml (idempotent)
  const { migrateConfig } = require('./migrate-config.js');
  migrateConfig(path.join(novaspecDest, 'config.yml'));

  // Refresh SessionStart hook in any installed runtime
  ensureSessionStartHook(destDir);

  printReport({ version: newManifest.version, created, updated, skipped, removed, skippedRemoved });
}

function printReport({ version, created, updated, skipped, removed, skippedRemoved }) {
  console.log(`\n  ✓ nova-spec synced to v${version}\n`);

  if (created.length) {
    console.log(`  + ${created.length} new file(s):`);
    for (const f of created) console.log(`     ${f}`);
  }
  if (updated.length) {
    console.log(`  ↻ ${updated.length} file(s) updated (untouched locally):`);
    for (const f of updated) console.log(`     ${f}`);
  }
  if (skipped.length) {
    console.log(`  ⚠ ${skipped.length} file(s) NOT updated (you have local edits):`);
    for (const f of skipped) console.log(`     ${f}  → /nova-diff ${f}`);
  }
  if (removed.length) {
    console.log(`  − ${removed.length} file(s) removed upstream:`);
    for (const f of removed) console.log(`     ${f}`);
  }
  if (skippedRemoved.length) {
    console.log(`  ⚠ ${skippedRemoved.length} file(s) removed upstream but kept (you edited them):`);
    for (const f of skippedRemoved) console.log(`     ${f}`);
  }
  if (!created.length && !updated.length && !skipped.length && !removed.length && !skippedRemoved.length) {
    console.log('  ✓ Already up to date.');
  }
  console.log('');
}

function buildHookCommand() {
  const logPath = path.join(os.homedir(), '.nova-spec.log');
  return `npx nova-spec@latest sync >> ${logPath} 2>&1 || true ${HOOK_MARKER}`;
}

function ensureSessionStartHook(destDir) {
  const hookCommand = buildHookCommand();
  const novaHook = { type: 'command', command: hookCommand, timeout: 30 };

  const targets = [
    path.join(destDir, '.claude', 'settings.local.json'),
    path.join(destDir, '.opencode', 'settings.local.json'),
  ].filter(p => fs.existsSync(path.dirname(p)));

  for (const settingsPath of targets) {
    let settings = {};
    if (fs.existsSync(settingsPath)) {
      try {
        settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      } catch (err) {
        console.error(`  ⚠ Could not parse ${settingsPath}: ${err.message}`);
        console.error('     Skipping hook update for this file. Fix the JSON and re-run sync.');
        continue;
      }
    }

    settings.hooks = settings.hooks || {};
    settings.hooks.SessionStart = settings.hooks.SessionStart || [];

    let updated = false;
    for (const group of settings.hooks.SessionStart) {
      group.hooks = group.hooks || [];
      for (let i = 0; i < group.hooks.length; i++) {
        if (group.hooks[i]?.command?.includes(HOOK_MARKER)) {
          if (group.hooks[i].command !== hookCommand) {
            group.hooks[i] = novaHook;
          }
          updated = true;
        }
      }
    }

    if (!updated) {
      settings.hooks.SessionStart.push({ hooks: [novaHook] });
    }

    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
  }
}

module.exports = {
  sync,
  generateManifest,
  ensureSessionStartHook,
  buildHookCommand,
  readManifest,
  collectPackageFiles,
  HOOK_MARKER,
  FRAMEWORK_FILES,
  MANIFEST_FILE,
};
