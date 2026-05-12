'use strict';

const fs = require('fs');
const path = require('path');
const { select, input, confirm } = require('@inquirer/prompts');
const {
  generateManifest,
  buildHookCommand,
  HOOK_MARKER,
  MANIFEST_FILE,
  writeAtomic,
} = require('./sync.js');
const { detectForge } = require('./forge.js');
const { listTransitionsAsync } = require('./jira.js');
const {
  CONTEXT_README,
  DECISIONS_README,
  ARCHIVED_README,
  GOTCHAS_README,
  SERVICES_README,
} = require('./context-templates.js');

const PACKAGE_ROOT = path.join(__dirname, '..');
const NOVASPEC_SRC = path.join(PACKAGE_ROOT, 'novaspec');
const AGENTS_SRC = path.join(PACKAGE_ROOT, 'AGENTS.md');
const CLAUDE_MD_SRC = path.join(PACKAGE_ROOT, 'CLAUDE.md');

async function init() {
  console.log('\n  nova-spec installer\n  ───────────────────\n');

  // Detect an existing installation in the current directory or globally.
  // Re-running `init` from scratch would clobber the user's customizations,
  // because the wizard path uses copyTree which doesn't hash-compare like
  // sync does. So we refuse and route to sync instead.
  const home = process.env.HOME || process.env.USERPROFILE;
  const existingHere = fs.existsSync(path.join(process.cwd(), 'novaspec', MANIFEST_FILE));
  const existingGlobal =
    home && fs.existsSync(path.join(home, '.claude', 'novaspec', MANIFEST_FILE));

  if (existingHere || existingGlobal) {
    const where = existingHere ? `here (${process.cwd()})` : `globally (${home}/.claude)`;
    console.log(`  ⚠ nova-spec is already installed ${where}.`);
    console.log('     Running init again would overwrite local customizations.');
    console.log();
    const ok = await confirm({
      message: 'Run `sync` instead (preserves your edits via hash-compare)?',
      default: true,
    });
    if (!ok) {
      console.log('  Cancelled. To reinstall from scratch, remove `novaspec/` manually first.');
      return;
    }
    const { sync } = require('./sync.js');
    await sync(existingHere ? process.cwd() : path.join(home, '.claude'));
    return;
  }

  const scope = await select({
    message: 'Where do you want to install nova-spec?',
    choices: [
      { name: 'This project only  (installs in current directory)', value: 'project' },
      { name: 'Global  (works in all your projects via ~/.claude)', value: 'global' },
      { name: 'Update existing installation', value: 'update' },
    ],
  });

  if (scope === 'global' && !home) {
    console.error('  ✗ HOME / USERPROFILE not set; cannot resolve global install path.');
    process.exit(1);
  }

  const destDir = scope === 'global' ? path.join(home, '.claude') : process.cwd();

  if (scope === 'update') {
    const { sync } = require('./sync.js');
    await sync(destDir);
    return;
  }

  const runtime = await select({
    message: 'Which AI runtime do you use?',
    choices: [
      { name: 'Claude Code', value: 'claude' },
      { name: 'OpenCode', value: 'opencode' },
      { name: 'Both', value: 'both' },
    ],
  });

  if (scope === 'global' && runtime !== 'claude') {
    console.warn('\n  ⚠ Global install currently only supports Claude Code.');
    console.warn('     For OpenCode, use a project install.\n');
  }

  const ticketSystem = await select({
    message: 'Ticket system:',
    choices: [
      { name: 'Jira', value: 'jira' },
      { name: 'None  (paste tickets manually)', value: 'none' },
    ],
  });

  const jiraConfig = await collectJiraConfig(ticketSystem === 'jira');

  const baseBranch = await input({ message: 'Base branch:', default: 'main' });

  const detectedForge = scope === 'project' ? detectForge(destDir) : null;
  const forgeType = await select({
    message: detectedForge ? `Forge (detected: ${detectedForge}):` : 'Forge:',
    choices: [
      { name: 'Auto-detect from git remote', value: 'auto' },
      { name: 'GitHub  (gh)', value: 'github' },
      { name: 'GitLab  (glab)', value: 'gitlab' },
      { name: 'None / manual', value: 'none' },
    ],
    default: detectedForge || 'auto',
  });

  console.log('\n  Summary:');
  console.log(`  → Scope:    ${scope === 'global' ? 'Global (' + destDir + ')' : 'Project (' + destDir + ')'}`);
  console.log(`  → Runtime:  ${runtime}`);
  console.log(`  → Tickets:  ${ticketSystem === 'jira' ? jiraConfig.url + ' / ' + jiraConfig.project : 'manual'}`);
  console.log(`  → Forge:    ${forgeType}`);
  console.log(`  → Branch:   ${baseBranch}\n`);

  const ok = await confirm({ message: 'Install with these settings?', default: true });
  if (!ok) {
    console.log('  Cancelled.');
    return;
  }

  installFiles(destDir, runtime, scope);
  writeConfig(destDir, { ticketSystem, jiraConfig, baseBranch, forgeType });

  // Manifest reflects what we just shipped from the package.
  const manifest = generateManifest(PACKAGE_ROOT);
  writeAtomic(
    path.join(destDir, 'novaspec', MANIFEST_FILE),
    JSON.stringify(manifest, null, 2) + '\n',
  );

  console.log('\n  ✓ nova-spec installed!\n');
  console.log('  Next step: open Claude Code or OpenCode in this directory and run:');
  console.log('    /nova-start TICKET-123\n');
}

async function collectJiraConfig(useJira) {
  const config = {
    skill: '',
    url: '',
    project: '',
    email: '',
    token: '${JIRA_API_TOKEN}',
    done_transition_id: '41',
  };

  if (!useJira) return config;

  config.skill = 'jira-integration';
  config.url = await input({
    message: 'Jira URL:',
    default: 'https://your-workspace.atlassian.net',
  });
  config.project = await input({ message: 'Jira project key:', default: 'PROJ' });
  config.email = await input({ message: 'Your Jira email:' });

  console.log('\n  Tip: set JIRA_API_TOKEN in your environment.');
  console.log('  Get your token at: https://id.atlassian.com/manage-profile/security/api-tokens\n');

  const token = process.env.JIRA_API_TOKEN;
  if (token && config.email && config.url) {
    const validate = await confirm({
      message: 'Validate Jira "Done" transition by listing transitions of an existing ticket?',
      default: true,
    });
    if (validate) {
      const sampleKey = await input({
        message: `Sample ticket key (e.g. ${config.project}-1):`,
        default: `${config.project}-1`,
      });
      try {
        const transitions = await listTransitionsAsync({
          url: config.url,
          email: config.email,
          token,
          ticket: sampleKey,
        });
        if (transitions.length === 0) {
          console.warn('  ⚠ No transitions returned. Falling back to manual entry.');
        } else {
          const choice = await select({
            message: 'Which transition closes a ticket as Done?',
            choices: transitions.map((t) => ({
              name: `${t.name}  (id: ${t.id})`,
              value: t.id,
            })),
          });
          config.done_transition_id = choice;
          return config;
        }
      } catch (err) {
        console.warn(`  ⚠ Could not validate via API: ${err.message}`);
        console.warn('     Falling back to manual entry.\n');
      }
    }
  }

  config.done_transition_id = await input({
    message: 'Jira "Done" transition ID:',
    default: '41',
  });

  return config;
}

function installFiles(destDir, runtime, scope) {
  const destNovaspec = path.join(destDir, 'novaspec');

  // Backup config.yml in case copyTree ever changes
  const destConfigPath = path.join(destNovaspec, 'config.yml');
  const configBackup = fs.existsSync(destConfigPath)
    ? fs.readFileSync(destConfigPath, 'utf8')
    : null;

  copyTree(NOVASPEC_SRC, destNovaspec, { exclude: ['config.yml', MANIFEST_FILE] });

  if (configBackup) fs.writeFileSync(destConfigPath, configBackup);

  // Framework files at top level
  if (fs.existsSync(AGENTS_SRC)) fs.copyFileSync(AGENTS_SRC, path.join(destDir, 'AGENTS.md'));
  if (fs.existsSync(CLAUDE_MD_SRC) && !fs.existsSync(path.join(destDir, 'CLAUDE.md'))) {
    fs.copyFileSync(CLAUDE_MD_SRC, path.join(destDir, 'CLAUDE.md'));
  }

  if (scope === 'project') {
    scaffoldContext(destDir);
  }

  if (runtime === 'claude' || runtime === 'both') {
    const linkDir = scope === 'global' ? destDir : path.join(destDir, '.claude');
    createSymlinks(linkDir, destNovaspec);
    writeClaudeSettings(linkDir);
  }
  if (runtime === 'opencode' || runtime === 'both') {
    if (scope === 'global') {
      console.warn('  ⚠ Skipping OpenCode global setup (use project install instead).');
    } else {
      const linkDir = path.join(destDir, '.opencode');
      createSymlinks(linkDir, destNovaspec);
      writeOpenCodeSettings(linkDir);
    }
  }

  ensureGitignore(destDir);
}

function scaffoldContext(destDir) {
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

  const notes = path.join(destDir, 'notes.md');
  if (!fs.existsSync(notes)) fs.writeFileSync(notes, '');

  // Top-level scaffolding files explaining their purpose
  writeIfMissing(path.join(destDir, 'context/stack.md'), STACK_TEMPLATE);
  writeIfMissing(path.join(destDir, 'context/conventions.md'), CONVENTIONS_TEMPLATE);

  scaffoldContextReadmes(destDir);
}

// Idempotent: only writes files that are missing. Safe to call repeatedly
// from sync.js so existing installs pick up new READMEs at the next
// auto-sync without overwriting anything the team has edited.
function scaffoldContextReadmes(destDir) {
  // Ensure parent dirs exist (sync might run before a full init)
  for (const dir of ['context', 'context/decisions', 'context/decisions/archived', 'context/gotchas', 'context/services']) {
    fs.mkdirSync(path.join(destDir, dir), { recursive: true });
  }

  writeIfMissing(path.join(destDir, 'context/README.md'), CONTEXT_README);
  writeIfMissing(path.join(destDir, 'context/decisions/README.md'), DECISIONS_README);
  writeIfMissing(path.join(destDir, 'context/decisions/archived/README.md'), ARCHIVED_README);
  writeIfMissing(path.join(destDir, 'context/gotchas/README.md'), GOTCHAS_README);
  writeIfMissing(path.join(destDir, 'context/services/README.md'), SERVICES_README);
}

function writeIfMissing(filePath, content) {
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, content);
}

const STACK_TEMPLATE = `<!--
  context/stack.md — describe the technology stack of this project.

  Loaded by nova-spec at the start of every ticket so the agent knows what
  language, frameworks, and key dependencies you use. Keep it short and factual:
  versions matter, philosophy doesn't.

  Edit freely. Update it whenever you upgrade a major dependency.
-->

# Stack

## Language & runtime
- e.g. Node.js 20.x  /  Ruby 3.3  /  Python 3.12

## Framework
- e.g. Next.js 14 (App Router)  /  Rails 7.1  /  FastAPI 0.110

## Key dependencies
- e.g. PostgreSQL 16, Redis 7, Sidekiq 7
- e.g. tailwindcss, prisma, vitest

## Infrastructure
- e.g. AWS (ECS, RDS), GitHub Actions, Cloudflare Workers
`;

const CONVENTIONS_TEMPLATE = `<!--
  context/conventions.md — house rules and patterns for this codebase.

  Loaded by nova-spec at the start of every ticket so the agent writes code
  that matches your team's style without you having to repeat yourself. List
  things that are NOT obvious from reading the code.

  Edit freely. One line per rule is fine.
-->

# Conventions

## Code style
- e.g. 2-space indent, single quotes, trailing commas
- e.g. functional components only; no class components
- e.g. no default exports

## Patterns we follow
- e.g. service layer for all DB access; controllers stay thin
- e.g. errors as values, not thrown (Result/Either)
- e.g. one component per file

## Patterns we avoid
- e.g. no global mutable state
- e.g. no \`any\` in TypeScript
- e.g. no inline styles

## Tests
- e.g. characterization tests before refactoring
- e.g. one assertion per test
- e.g. fixtures in \`__fixtures__/\`, not inline
`;

function createSymlinks(linkDir, novaspecDir) {
  fs.mkdirSync(linkDir, { recursive: true });
  for (const name of ['commands', 'skills', 'agents']) {
    const link = path.join(linkDir, name);
    const target = path.relative(linkDir, path.join(novaspecDir, name));
    fs.rmSync(link, { recursive: true, force: true });
    const symlinkType = process.platform === 'win32' ? 'junction' : null;
    try {
      if (symlinkType) {
        fs.symlinkSync(target, link, symlinkType);
      } else {
        fs.symlinkSync(target, link);
      }
    } catch (err) {
      if (err.code === 'EPERM' && process.platform === 'win32') {
        console.warn(`  ⚠ Could not symlink ${name} (Windows needs Developer Mode).`);
        console.warn(`     Falling back to copy. Re-run sync to refresh.`);
        copyTree(path.join(novaspecDir, name), link);
      } else {
        throw err;
      }
    }
  }
}

function copyTree(src, dest, { exclude = [] } = {}) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (exclude.includes(entry.name)) continue;
    if (entry.isSymbolicLink()) continue;
    if (entry.name === 'node_modules') continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyTree(srcPath, destPath, { exclude });
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function writeClaudeSettings(claudeDir) {
  const settingsPath = path.join(claudeDir, 'settings.local.json');
  const novaHook = { type: 'command', command: buildHookCommand(), timeout: 30 };

  let settings = {};
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    } catch (err) {
      console.warn(`  ⚠ Could not parse ${settingsPath}: ${err.message}`);
      console.warn('     Skipping hook setup. Fix the JSON and run /nova-sync.');
      return;
    }
  }

  settings.hooks = settings.hooks || {};
  settings.hooks.SessionStart = settings.hooks.SessionStart || [];

  const alreadyHasNovaHook = settings.hooks.SessionStart.some((g) =>
    (g.hooks || []).some((h) => h?.command?.includes(HOOK_MARKER)),
  );

  if (!alreadyHasNovaHook) {
    settings.hooks.SessionStart.push({ hooks: [novaHook] });
  }

  writeAtomic(settingsPath, JSON.stringify(settings, null, 2) + '\n');
}

function writeOpenCodeSettings(opencodeDir) {
  const settingsPath = path.join(opencodeDir, 'settings.local.json');
  if (fs.existsSync(settingsPath)) return;
  writeAtomic(
    settingsPath,
    JSON.stringify(
      {
        $schema: 'https://opencode.ai/config.json',
        permission: { skill: { '*': 'allow' } },
      },
      null,
      2,
    ) + '\n',
  );
}

function writeConfig(destDir, { ticketSystem, jiraConfig, baseBranch, forgeType }) {
  const configPath = path.join(destDir, 'novaspec', 'config.yml');
  if (fs.existsSync(configPath)) return;

  const yamlString = (s) => JSON.stringify(s ?? '');
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
    `  base: ${yamlString(baseBranch)}`,
    '',
    'forge:',
    `  type: ${forgeType || 'auto'}`,
    '  cli: auto',
    '',
    `ticket_system: ${ticketSystem || 'jira'}`,
    '',
    'jira:',
    `  skill: ${yamlString(jiraConfig.skill)}`,
    `  url: ${yamlString(jiraConfig.url)}`,
    `  project: ${yamlString(jiraConfig.project)}`,
    `  email: ${yamlString(jiraConfig.email)}`,
    `  token: ${yamlString(jiraConfig.token)}`,
    `  done_transition_id: ${yamlString(jiraConfig.done_transition_id)}`,
    '  transitions:',
    `    done: ${yamlString(jiraConfig.done_transition_id)}`,
  ].join('\n') + '\n';

  writeAtomic(configPath, content);
}

function ensureGitignore(destDir) {
  const gitignorePath = path.join(destDir, '.gitignore');
  const marker = '# nova-spec (local)';

  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, 'utf8');
    if (content.includes(marker)) return;
  }

  // Project-install gitignore: only the personal/secret bits. Templates,
  // commands, skills, agents are committed so the team shares customizations.
  const lines = [
    '',
    marker,
    'novaspec/config.yml',
    `novaspec/${MANIFEST_FILE}`,
    '.env',
    'notes.md',
    '.claude/settings.local.json',
    '.opencode/settings.local.json',
    '.opencode/node_modules/',
    '.DS_Store',
    '# /nova-spec',
    '',
  ];

  fs.appendFileSync(gitignorePath, lines.join('\n'));
}

module.exports = { init, scaffoldContextReadmes };
