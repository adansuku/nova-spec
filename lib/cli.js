'use strict';

const fs = require('fs');
const path = require('path');
const { init } = require('./installer.js');
const { sync } = require('./sync.js');
const jira = require('./jira.js');

async function run() {
  const command = process.argv[2];

  switch (command) {
    case 'init':
    case undefined:
      await init();
      break;
    case 'sync':
      await sync();
      break;
    case 'jira':
      await runJira(process.argv.slice(3));
      break;
    case 'forge':
      await runForge(process.argv.slice(3));
      break;
    case 'source':
      runSource(process.argv.slice(3));
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.error('Usage: nova-spec [init|sync|jira <subcmd>|forge <subcmd>|source <path>]');
      process.exit(1);
  }
}

function runSource(args) {
  const [relPath] = args;
  if (!relPath) {
    console.error('Usage: nova-spec source <relative-path>');
    process.exit(2);
  }
  const PACKAGE_ROOT = path.join(__dirname, '..');
  const abs = path.join(PACKAGE_ROOT, relPath);
  if (!fs.existsSync(abs)) {
    console.error(`✗ ${relPath} is not part of the nova-spec package.`);
    process.exit(1);
  }
  console.log(abs);
}

async function runJira(args) {
  const [subcmd, ...rest] = args;
  if (!subcmd) {
    console.error('Usage: nova-spec jira <get|transitions|transition> [args...]');
    process.exit(2);
  }

  const config = readJiraConfig();
  if (!config) {
    console.error('  ✗ Jira not configured. Run `npx nova-spec init` and enable Jira.');
    process.exit(1);
  }

  try {
    let result;
    if (subcmd === 'get') {
      if (!rest[0]) throw new Error('Usage: nova-spec jira get <TICKET>');
      result = await jira.getIssueAsync({ ...config, ticket: rest[0] });
    } else if (subcmd === 'transitions') {
      if (!rest[0]) throw new Error('Usage: nova-spec jira transitions <TICKET>');
      result = await jira.listTransitionsAsync({ ...config, ticket: rest[0] });
    } else if (subcmd === 'transition') {
      if (!rest[0] || !rest[1]) throw new Error('Usage: nova-spec jira transition <TICKET> <ID>');
      result = await jira.transitionAsync({ ...config, ticket: rest[0], transitionId: rest[1] });
    } else {
      throw new Error(`Unknown jira subcommand: ${subcmd}`);
    }
    if (result != null) console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    if (err.status === 401) {
      console.error('  ✗ Jira 401: invalid credentials. Regenerate JIRA_API_TOKEN.');
    } else if (err.status === 404) {
      console.error(`  ✗ Jira 404: ticket not found.`);
    } else {
      console.error(`  ✗ ${err.message}`);
    }
    process.exit(err.status || 1);
  }
}

async function runForge(args) {
  const { detectForge, buildPrCommand, reviewTerm, checkCliAvailable } = require('./forge.js');
  const [subcmd, ...rest] = args;

  if (subcmd === 'detect') {
    const f = detectForge();
    if (f) console.log(f);
    else process.exit(1);
    return;
  }

  if (subcmd === 'pr-command') {
    const config = readForgeConfig();
    const forge = config.type !== 'auto' ? config.type : detectForge();
    if (!forge || forge === 'none') {
      console.error('  ✗ Forge not detected. Set forge.type in novaspec/config.yml.');
      process.exit(2);
    }
    const cli = config.cli !== 'auto' ? config.cli : null;
    const [title, body, base] = rest;
    if (!title || !body || !base) {
      console.error('Usage: nova-spec forge pr-command <title> <body> <base>');
      process.exit(2);
    }
    console.log(buildPrCommand({ forge, cli, title, body, base }));
    return;
  }

  if (subcmd === 'term') {
    const config = readForgeConfig();
    const forge = config.type !== 'auto' ? config.type : detectForge();
    console.log(reviewTerm(forge));
    return;
  }

  console.error('Usage: nova-spec forge <detect|pr-command|term>');
  process.exit(2);
}

function readJiraConfig() {
  const configPath = path.join(process.cwd(), 'novaspec', 'config.yml');
  if (!fs.existsSync(configPath)) return null;
  const text = fs.readFileSync(configPath, 'utf8');

  const url = extractYamlScalar(text, 'jira', 'url');
  const email = extractYamlScalar(text, 'jira', 'email');
  let token = extractYamlScalar(text, 'jira', 'token');

  if (token && /^\$\{[A-Z_]+\}$/.test(token)) {
    const envName = token.slice(2, -1);
    token = process.env[envName];
  } else if (token === '${JIRA_API_TOKEN}' || !token) {
    token = process.env.JIRA_API_TOKEN;
  }

  if (!url || !email || !token) return null;
  return { url, email, token };
}

function readForgeConfig() {
  const configPath = path.join(process.cwd(), 'novaspec', 'config.yml');
  const defaults = { type: 'auto', cli: 'auto' };
  if (!fs.existsSync(configPath)) return defaults;
  const text = fs.readFileSync(configPath, 'utf8');
  return {
    type: extractYamlScalar(text, 'forge', 'type') || 'auto',
    cli: extractYamlScalar(text, 'forge', 'cli') || 'auto',
  };
}

function extractYamlScalar(text, parent, key) {
  // Minimal YAML reader for `parent: \n  key: value` blocks. Strips quotes.
  const re = new RegExp(`^${parent}:\\s*$([\\s\\S]*?)(?=^\\S|\\Z)`, 'm');
  const block = text.match(re);
  if (!block) return null;
  const lineRe = new RegExp(`^\\s+${key}:\\s*(.*)$`, 'm');
  const match = block[1].match(lineRe);
  if (!match) return null;
  let value = match[1].trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  return value;
}

module.exports = { run };
