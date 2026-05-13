'use strict';

// Loads the README scaffolding files from lib/templates/context/.
// Each file is plain markdown — easier to edit than JS strings, renders
// in GitHub, and ships under lib/ via package.json files: array.
//
// Used by installer.js (on init) and sync.js (so existing installs pick
// up new READMEs at the next auto-sync).

const fs = require('fs');
const path = require('path');

const TEMPLATES_DIR = path.join(__dirname, 'templates', 'context');
const load = (name) => fs.readFileSync(path.join(TEMPLATES_DIR, name), 'utf8');

module.exports = {
  CONTEXT_README: load('context-README.md'),
  DECISIONS_README: load('decisions-README.md'),
  ARCHIVED_README: load('decisions-archived-README.md'),
  GOTCHAS_README: load('gotchas-README.md'),
  SERVICES_README: load('services-README.md'),
};
