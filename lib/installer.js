'use strict';

const fs = require('fs');
const path = require('path');
const { select, input, confirm } = require('@inquirer/prompts');
const { generateManifest } = require('./sync.js');

const PACKAGE_ROOT = path.join(__dirname, '..');
const NOVASPEC_SRC = path.join(PACKAGE_ROOT, 'novaspec');
const AGENTS_SRC = path.join(PACKAGE_ROOT, 'AGENTS.md');
const CLAUDE_MD_SRC = path.join(PACKAGE_ROOT, 'CLAUDE.md');

async function init() {
  console.log('\n  nova-spec installer\n  ───────────────────\n');

  // 1. Scope: global or project
  const scope = await select({
    message: 'Where do you want to install nova-spec?',
    choices: [
      { name: 'This project only  (installs in current directory)', value: 'project' },
      { name: 'Global  (works in all your projects via ~/.claude)', value: 'global' },
      { name: 'Update existing installation', value: 'update' },
    ],
  });

  const destDir = scope === 'global'
    ? path.join(process.env.HOME || process.env.USERPROFILE, '.claude')
    : process.cwd();

  if (scope === 'update') {
    const { sync } = require('./sync.js');
    await sync(destDir);
    return;
  }

  // 2. Runtime
  const runtime = await select({
    message: 'Which AI runtime do you use?',
    choices: [
      { name: 'Claude Code', value: 'claude' },
      { name: 'OpenCode', value: 'opencode' },
      { name: 'Both', value: 'both' },
    ],
  });

  // 3. Jira
  const useJira = await confirm({ message: 'Do you use Jira?', default: true });

  let jiraConfig = { skill: '', url: '', project: '', email: '', token: '${JIRA_API_TOKEN}', done_transition_id: '41' };

  if (useJira) {
    jiraConfig.skill = 'jira-integration';
    jiraConfig.url = await input({
      message: 'Jira URL:',
      default: 'https://your-workspace.atlassian.net',
    });
    jiraConfig.project = await input({ message: 'Jira project key:', default: 'PROJ' });
    jiraConfig.email = await input({ message: 'Your Jira email:' });
    jiraConfig.done_transition_id = await input({
      message: 'Jira "Done" transition ID (find it via GET /rest/api/3/issue/<TICKET>/transitions):',
      default: '41',
    });
    console.log('\n  Tip: set JIRA_API_TOKEN in your environment.');
    console.log('  Get your token at: https://id.atlassian.com/manage-profile/security/api-tokens\n');
  }

  // 4. Branch config
  const baseBranch = await input({ message: 'Base branch:', default: 'main' });

  // 5. Confirm
  console.log('\n  Summary:');
  console.log(`  → Scope:   ${scope === 'global' ? 'Global (~/.claude)' : 'Project (' + destDir + ')'}`);
  console.log(`  → Runtime: ${runtime}`);
  console.log(`  → Jira:    ${useJira ? jiraConfig.url + ' / ' + jiraConfig.project : 'disabled'}`);
  console.log(`  → Branch:  ${baseBranch}\n`);

  const ok = await confirm({ message: 'Install with these settings?', default: true });
  if (!ok) {
    console.log('  Cancelled.');
    return;
  }

  // 6. Install
  installFiles(destDir, runtime, scope);
  writeConfig(destDir, { jiraConfig, baseBranch });
  generateManifest(path.join(destDir, 'novaspec'));

  console.log('\n  ✓ nova-spec installed!\n');
  console.log('  Next step: open Claude Code or OpenCode in this directory and run:');
  console.log('    /nova-start TICKET-123\n');
}

function installFiles(destDir, runtime, scope) {
  // Copy novaspec/
  const destNovaspec = path.join(destDir, 'novaspec');
  const destNovaspecConfig = path.join(destNovaspec, 'config.yml');

  // Backup existing config.yml
  let configBackup = null;
  if (fs.existsSync(destNovaspecConfig)) {
    configBackup = fs.readFileSync(destNovaspecConfig, 'utf8');
  }

  copyDir(NOVASPEC_SRC, destNovaspec);

  // Restore config.yml if it existed (user's config wins)
  if (configBackup) {
    fs.writeFileSync(destNovaspecConfig, configBackup);
  }

  // Copy AGENTS.md and CLAUDE.md
  if (fs.existsSync(AGENTS_SRC)) fs.copyFileSync(AGENTS_SRC, path.join(destDir, 'AGENTS.md'));
  if (fs.existsSync(CLAUDE_MD_SRC)) fs.copyFileSync(CLAUDE_MD_SRC, path.join(destDir, 'CLAUDE.md'));

  // Create context/ structure (only for project scope)
  if (scope === 'project') {
    for (const dir of [
      'context/decisions/archived',
      'context/gotchas',
      'context/services',
      'context/changes/active',
      'context/changes/archive',
    ]) {
      fs.mkdirSync(path.join(destDir, dir), { recursive: true });
    }
    const gitkeep = path.join(destDir, 'context/changes/active/.gitkeep');
    if (!fs.existsSync(gitkeep)) fs.writeFileSync(gitkeep, '');

    // notes.md
    const notes = path.join(destDir, 'notes.md');
    if (!fs.existsSync(notes)) fs.writeFileSync(notes, '');
  }

  // Runtime symlinks / .opencode settings
  if (runtime === 'claude' || runtime === 'both') {
    createSymlinks(destDir, '.claude');
  }
  if (runtime === 'opencode' || runtime === 'both') {
    createSymlinks(destDir, '.opencode');
    writeOpenCodeSettings(path.join(destDir, '.opencode'));
  }

  // .gitignore
  ensureGitignore(destDir);
}

function createSymlinks(destDir, dotDir) {
  const dir = path.join(destDir, dotDir);
  fs.mkdirSync(dir, { recursive: true });
  for (const name of ['commands', 'skills', 'agents']) {
    const link = path.join(dir, name);
    const target = path.join('..', 'novaspec', name);
    if (fs.existsSync(link) || fs.lstatSync(link).isSymbolicLink?.()) {
      fs.rmSync(link, { recursive: true, force: true });
    }
    fs.symlinkSync(target, link);
  }
}

function writeOpenCodeSettings(opencodeDir) {
  const settingsPath = path.join(opencodeDir, 'settings.local.json');
  if (!fs.existsSync(settingsPath)) {
    fs.writeFileSync(settingsPath, JSON.stringify({
      $schema: 'https://opencode.ai/config.json',
      permission: { skill: { '*': 'allow' } },
    }, null, 2) + '\n');
  }
}

function writeConfig(destDir, { jiraConfig, baseBranch }) {
  const configPath = path.join(destDir, 'novaspec', 'config.yml');
  if (fs.existsSync(configPath)) return; // already restored from backup

  const content = [
    '# nova-spec — project configuration',
    '# This file is gitignored — do not push it to the repo.',
    '',
    'branch:',
    '  pattern: "{type}/{ticket}-{slug}"',
    '  types:',
    '    bugfix: bugfix',
    '    hotfix: hotfix',
    '    feature: feature',
    '    documentation: docs',
    '    refactor: refactor',
    '    chore: chore',
    '    architecture: arch',
    '  ticket_case: upper',
    `  base: ${baseBranch}`,
    '',
    'jira:',
    `  skill: "${jiraConfig.skill}"`,
    `  url: ${jiraConfig.url}`,
    `  project: ${jiraConfig.project}`,
    `  email: ${jiraConfig.email}`,
    `  token: ${jiraConfig.token}`,
    `  done_transition_id: "${jiraConfig.done_transition_id}"`,
  ].join('\n') + '\n';

  fs.writeFileSync(configPath, content);
}

function ensureGitignore(destDir) {
  const gitignorePath = path.join(destDir, '.gitignore');
  const marker = '# nova-spec (local)';

  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, 'utf8');
    if (content.includes(marker)) return;
  }

  const block = [
    '',
    '# nova-spec (local)',
    'novaspec/config.yml',
    'novaspec/custom/',
    '.env',
    'notes.md',
    '.opencode/settings.local.json',
    '.opencode/node_modules/',
    '.DS_Store',
    '# /nova-spec',
    '',
  ].join('\n');

  fs.appendFileSync(gitignorePath, block);
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.name === 'config.yml') continue; // never overwrite user config
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

module.exports = { init };
