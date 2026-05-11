'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MANIFEST_FILE = '.nova-manifest.json';
const HOOK_MARKER = '# nova-spec auto-sync';
const FRAMEWORK_FILES = ['AGENTS.md', 'CLAUDE.md'];
// Paths the user owns or that are auto-generated — never tracked or overwritten.
const NEVER_TRACK = new Set(['novaspec/config.yml', `novaspec/${MANIFEST_FILE}`]);

// Write content to a file via tmp + rename, so partial writes (SIGKILL,
// disk-full mid-write) never leave a half-written file behind. Critical for
// the manifest and settings.local.json — corrupted JSON there kills the
// framework or the IDE startup.
function writeAtomic(filePath, content) {
  const tmp = `${filePath}.tmp.${process.pid}.${Date.now()}`;
  fs.writeFileSync(tmp, content);
  try {
    fs.renameSync(tmp, filePath);
  } catch (err) {
    try { fs.unlinkSync(tmp); } catch (_) {}
    throw err;
  }
}

function hashFile(filePath) {
  // Refuse to follow symlinks. If the user replaced a tracked file with a
  // symlink, hash the link target STRING (not the resolved file) so the
  // change is detected as "modified" and the framework leaves it alone.
  const stat = fs.lstatSync(filePath);
  if (stat.isSymbolicLink()) {
    return crypto.createHash('sha256').update(fs.readlinkSync(filePath)).digest('hex');
  }
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
    // Corrupt manifest → back it up and continue with empty. Combined with the
    // conservative sync rule (no previousShipped → SKIP), this preserves every
    // local file. Replaces a hard process.exit that left users stuck.
    const backup = `${manifestPath}.corrupt.${Date.now()}`;
    try {
      fs.renameSync(manifestPath, backup);
      console.warn(`  ⚠ Manifest was corrupt; backed up to ${path.basename(backup)} and continuing.`);
      console.warn('     Until the manifest is rebuilt, sync will skip every file that differs from the package.');
    } catch (renameErr) {
      console.warn(`  ⚠ Manifest is corrupt and could not be backed up: ${renameErr.message}`);
    }
    return { files: {} };
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

  // Migrate config.yml BEFORE writing the manifest, so a crash here doesn't
  // leave the manifest claiming "new version applied" while config is stale.
  const { migrateConfig } = require('./migrate-config.js');
  migrateConfig(path.join(novaspecDest, 'config.yml'));

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

    // Only overwrite when we KNOW the user didn't touch it: previousShipped
    // must be recorded AND match the current disk hash. If the manifest is
    // missing or doesn't mention this file, treat as user-owned and skip.
    if (previousShipped && currentHash === previousShipped) {
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
  writeAtomic(manifestPath, JSON.stringify(newManifest, null, 2) + '\n');

  // Refresh runtime dirs: re-link .claude/{commands,skills,agents} if a previous
  // install on Windows fell back to copy. Idempotent — no-op when already linked.
  refreshRuntimeLinks(destDir);

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
  // Use $HOME so the shell resolves it at run time. Avoids baking the
  // installer's home dir into the consumer's settings and survives paths
  // with spaces / apostrophes (common on macOS and Windows usernames).
  return `npx nova-spec@latest sync >> "$HOME/.nova-spec.log" 2>&1 || true ${HOOK_MARKER}`;
}

function ensureSessionStartHook(destDir) {
  const hookCommand = buildHookCommand();
  const novaHook = { type: 'command', command: hookCommand, timeout: 30 };

  const targets = [
    path.join(destDir, '.claude', 'settings.local.json'),
    path.join(destDir, '.opencode', 'settings.local.json'),
  ].filter(p => fs.existsSync(path.dirname(p)));

  // Any hook command running `npx nova-spec[@<tag>] sync` is OURS, even if
  // it doesn't carry the modern marker (older installs from before v1.0.2).
  // Strip all of them and append one canonical entry — guaranteed dedupe.
  const isNovaHook = (h) =>
    h && typeof h.command === 'string' && /\bnpx\s+nova-spec(@\S+)?\s+sync\b/.test(h.command);

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

    for (const group of settings.hooks.SessionStart) {
      if (!Array.isArray(group.hooks)) continue;
      group.hooks = group.hooks.filter((h) => !isNovaHook(h));
    }
    // Drop groups whose hooks array is now empty
    settings.hooks.SessionStart = settings.hooks.SessionStart.filter(
      (g) => Array.isArray(g.hooks) && g.hooks.length > 0,
    );

    settings.hooks.SessionStart.push({ hooks: [novaHook] });

    writeAtomic(settingsPath, JSON.stringify(settings, null, 2) + '\n');
  }
}

function refreshRuntimeLinks(destDir) {
  // Re-establish symlinks under .claude/ and .opencode/ if a previous install
  // copied them instead (Windows EPERM fallback). On systems where symlinks
  // are permitted this is a no-op; on Windows without Developer Mode it
  // refreshes the copy with the latest content.
  const novaspecDir = path.join(destDir, 'novaspec');
  if (!fs.existsSync(novaspecDir)) return;

  const runtimeDirs = ['.claude', '.opencode']
    .map((d) => path.join(destDir, d))
    .filter((d) => fs.existsSync(d));

  for (const rt of runtimeDirs) {
    for (const name of ['commands', 'skills', 'agents']) {
      const link = path.join(rt, name);
      const target = path.relative(rt, path.join(novaspecDir, name));

      let isLink = false;
      try {
        isLink = fs.lstatSync(link).isSymbolicLink();
      } catch (_) {
        /* doesn't exist — fall through to create */
      }

      if (isLink) continue; // already linked, nothing to do

      // It's a directory of copied files (Windows fallback) or missing.
      // Try to make it a symlink; if that fails, refresh the copy.
      fs.rmSync(link, { recursive: true, force: true });
      const symlinkType = process.platform === 'win32' ? 'junction' : null;
      try {
        if (symlinkType) fs.symlinkSync(target, link, symlinkType);
        else fs.symlinkSync(target, link);
      } catch (err) {
        if (err.code === 'EPERM' || err.code === 'EACCES') {
          copyTreeShallow(path.join(novaspecDir, name), link);
        } else {
          throw err;
        }
      }
    }
  }
}

function copyTreeShallow(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyTreeShallow(s, d);
    else fs.copyFileSync(s, d);
  }
}

module.exports = {
  sync,
  generateManifest,
  ensureSessionStartHook,
  buildHookCommand,
  readManifest,
  collectPackageFiles,
  refreshRuntimeLinks,
  writeAtomic,
  HOOK_MARKER,
  FRAMEWORK_FILES,
  MANIFEST_FILE,
};
