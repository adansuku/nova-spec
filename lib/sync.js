'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MANIFEST_FILE = '.nova-manifest.json';

function hashFile(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(content).digest('hex');
}

function walkDir(dir, base = dir) {
  const results = {};
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(base, fullPath);
    if (entry.isDirectory()) {
      Object.assign(results, walkDir(fullPath, base));
    } else {
      results[relPath] = hashFile(fullPath);
    }
  }
  return results;
}

function generateManifest(novaspecDir) {
  const coreDir = novaspecDir;
  const hashes = {};

  for (const section of ['commands', 'skills', 'agents']) {
    const sectionDir = path.join(coreDir, section);
    if (!fs.existsSync(sectionDir)) continue;
    for (const entry of fs.readdirSync(sectionDir, { withFileTypes: true })) {
      if (!entry.isDirectory() && !entry.name.endsWith('.md')) continue;
      const name = entry.name.replace('.md', '');
      const fullPath = path.join(sectionDir, entry.name);
      if (entry.isDirectory()) {
        hashes[`${section}/${name}`] = walkDir(fullPath);
      } else {
        hashes[`${section}/${name}`] = hashFile(fullPath);
      }
    }
  }

  const manifest = {
    version: require('../package.json').version,
    generated_at: new Date().toISOString(),
    hashes,
    outdated_customs: [],
  };

  const manifestPath = path.join(novaspecDir, MANIFEST_FILE);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

async function sync(destDir = process.cwd()) {
  const novaspecDest = path.join(destDir, 'novaspec');
  const manifestPath = path.join(novaspecDest, MANIFEST_FILE);

  if (!fs.existsSync(novaspecDest)) {
    console.error('  ✗ nova-spec not installed in this directory. Run: npx nova-spec init');
    process.exit(1);
  }

  // Read existing manifest
  const oldManifest = fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    : { hashes: {} };

  // Update core files from package
  const PACKAGE_ROOT = path.join(__dirname, '..');
  const NOVASPEC_SRC = path.join(PACKAGE_ROOT, 'novaspec');

  // Backup config.yml
  const configPath = path.join(novaspecDest, 'config.yml');
  let configBackup = null;
  if (fs.existsSync(configPath)) {
    configBackup = fs.readFileSync(configPath, 'utf8');
  }

  copyDirSync(NOVASPEC_SRC, novaspecDest);

  // Restore config
  if (configBackup) fs.writeFileSync(configPath, configBackup);

  // Regenerate manifest with new hashes
  const newManifest = generateManifest(novaspecDest);

  // Check custom overrides
  const customDir = path.join(novaspecDest, 'custom');
  const outdated = [];

  if (fs.existsSync(customDir)) {
    for (const section of ['commands', 'skills', 'agents']) {
      const customSection = path.join(customDir, section);
      if (!fs.existsSync(customSection)) continue;
      for (const entry of fs.readdirSync(customSection, { withFileTypes: true })) {
        const name = entry.name.replace('.md', '');
        const key = `${section}/${name}`;
        const oldHash = oldManifest.hashes[key];
        const newHash = newManifest.hashes[key];
        if (oldHash && newHash && JSON.stringify(oldHash) !== JSON.stringify(newHash)) {
          outdated.push(name);
        }
      }
    }
  }

  // Save outdated list in manifest
  newManifest.outdated_customs = outdated;
  fs.writeFileSync(manifestPath, JSON.stringify(newManifest, null, 2) + '\n');

  // Report
  console.log('\n  ✓ nova-spec core updated to v' + newManifest.version + '\n');

  if (outdated.length > 0) {
    console.log('  ⚠️  Custom overrides with upstream changes:');
    for (const name of outdated) {
      console.log(`     - ${name} → run /nova-diff ${name} to review`);
    }
  } else {
    console.log('  ✓ No custom overrides affected.');
  }
  console.log('');
}

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name === 'config.yml') continue;
    if (entry.name === 'custom') continue; // never overwrite custom/
    if (entry.name === MANIFEST_FILE) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

module.exports = { sync, generateManifest };
