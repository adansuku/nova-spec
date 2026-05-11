'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { init } = require('./installer.js');
const { sync } = require('./sync.js');
const jira = require('./jira.js');

const PACKAGE_ROOT = path.resolve(__dirname, '..');

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

  // Resolve and CONTAIN within PACKAGE_ROOT. Rejects ../ traversal so prompt
  // injection through $ARGUMENTS can't read arbitrary files via /nova-diff.
  const abs = path.resolve(PACKAGE_ROOT, relPath);
  const rootWithSep = PACKAGE_ROOT + path.sep;
  if (abs !== PACKAGE_ROOT && !abs.startsWith(rootWithSep)) {
    console.error(`✗ Path escapes the nova-spec package: ${relPath}`);
    process.exit(1);
  }
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
  if (!config.ok) {
    console.error(`  ✗ ${config.error}`);
    if (config.hint) console.error(`     ${config.hint}`);
    process.exit(1);
  }

  try {
    let result;
    const baseArgs = { url: config.url, email: config.email, token: config.token };
    if (subcmd === 'get') {
      if (!rest[0]) throw new Error('Usage: nova-spec jira get <TICKET>');
      result = await jira.getIssueAsync({ ...baseArgs, ticket: rest[0] });
    } else if (subcmd === 'transitions') {
      if (!rest[0]) throw new Error('Usage: nova-spec jira transitions <TICKET>');
      result = await jira.listTransitionsAsync({ ...baseArgs, ticket: rest[0] });
    } else if (subcmd === 'transition') {
      if (!rest[0] || !rest[1]) throw new Error('Usage: nova-spec jira transition <TICKET> <ID>');
      result = await jira.transitionAsync({ ...baseArgs, ticket: rest[0], transitionId: rest[1] });
    } else {
      throw new Error(`Unknown jira subcommand: ${subcmd}`);
    }
    if (result != null) console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    if (err.status === 401) {
      console.error('  ✗ Jira 401: invalid credentials. Regenerate JIRA_API_TOKEN at');
      console.error('     https://id.atlassian.com/manage-profile/security/api-tokens');
    } else if (err.status === 404) {
      console.error(`  ✗ Jira 404: ${rest[0] || 'ticket'} not found.`);
    } else {
      console.error(`  ✗ ${err.message}`);
    }
    process.exit(err.status || 1);
  }
}

async function runForge(args) {
  const { detectForge, buildPrCommand, reviewTerm, checkCliAvailable, pickCli } = require('./forge.js');
  const [subcmd, ...rest] = args;

  if (subcmd === 'detect') {
    const f = detectForge();
    if (f) {
      console.log(f);
    } else {
      console.error('✗ No git remote `origin` or unsupported forge.');
      process.exit(1);
    }
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
    const resolvedCli = pickCli(forge, cli);
    if (resolvedCli && !checkCliAvailable(resolvedCli)) {
      console.error(`  ✗ ${resolvedCli} is not installed or not on PATH.`);
      console.error(`     Install: ${resolvedCli === 'gh' ? 'https://cli.github.com/' : 'https://gitlab.com/gitlab-org/cli'}`);
      process.exit(127);
    }
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

// Parse novaspec/config.yml into a plain JS object. Returns null if missing.
// Returns null + warns if YAML is malformed (don't crash callers).
function loadConfig() {
  const configPath = path.join(process.cwd(), 'novaspec', 'config.yml');
  if (!fs.existsSync(configPath)) return null;
  try {
    return yaml.load(fs.readFileSync(configPath, 'utf8')) || {};
  } catch (err) {
    return { __parseError: err.message };
  }
}

function readJiraConfig() {
  const cfg = loadConfig();
  if (!cfg) {
    return { ok: false, error: 'novaspec/config.yml not found.', hint: 'Run: npx nova-spec init' };
  }
  if (cfg.__parseError) {
    return { ok: false, error: `novaspec/config.yml has invalid YAML: ${cfg.__parseError}` };
  }

  const jiraCfg = cfg.jira || {};
  const { url, email } = jiraCfg;
  let token = jiraCfg.token;

  // Resolve ${ENV_VAR} reference
  if (typeof token === 'string') {
    const m = token.match(/^\$\{([A-Z_][A-Z0-9_]*)\}$/);
    if (m) token = process.env[m[1]];
  }
  if (!token) token = process.env.JIRA_API_TOKEN;

  if (!url || !email) {
    return {
      ok: false,
      error: 'Jira not configured.',
      hint: 'Set jira.url and jira.email in novaspec/config.yml, or run: npx nova-spec init',
    };
  }
  if (!token) {
    return {
      ok: false,
      error: 'JIRA_API_TOKEN env var is not set.',
      hint: 'Export it in your shell rc. Get one at https://id.atlassian.com/manage-profile/security/api-tokens',
    };
  }

  return { ok: true, url, email, token };
}

function readForgeConfig() {
  const cfg = loadConfig();
  const defaults = { type: 'auto', cli: 'auto' };
  if (!cfg || cfg.__parseError) return defaults;
  const forge = cfg.forge || {};
  return {
    type: forge.type || 'auto',
    cli: forge.cli || 'auto',
  };
}

module.exports = { run, loadConfig, readJiraConfig, readForgeConfig };
