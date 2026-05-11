'use strict';

const { execSync } = require('child_process');

function detectForge(cwd = process.cwd()) {
  let remote = '';
  try {
    remote = execSync('git remote get-url origin', { cwd, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch (_) {
    return null;
  }

  if (!remote) return null;
  if (/github\.com[:/]/i.test(remote)) return 'github';
  if (/gitlab[.-][\w.-]+[:/]|gitlab\.com[:/]/i.test(remote)) return 'gitlab';
  if (/bitbucket\.org[:/]/i.test(remote)) return 'bitbucket';
  return null;
}

function pickCli(forge, configCli) {
  if (configCli && configCli !== 'auto') return configCli;
  if (forge === 'github') return 'gh';
  if (forge === 'gitlab') return 'glab';
  return null;
}

function buildPrCommand({ forge, cli, title, body, base }) {
  const resolvedCli = cli || pickCli(forge);
  if (!resolvedCli) {
    throw new Error(`No CLI configured for forge "${forge}". Set forge.cli in config.yml.`);
  }

  const q = (s) => `'${String(s ?? '').replace(/'/g, `'\\''`)}'`;

  if (forge === 'github' || resolvedCli === 'gh') {
    return `gh pr create --base ${q(base)} --title ${q(title)} --body ${q(body)}`;
  }
  if (forge === 'gitlab' || resolvedCli === 'glab') {
    return `glab mr create --target-branch ${q(base)} --title ${q(title)} --description ${q(body)} --fill`;
  }
  throw new Error(`Unknown forge: ${forge}`);
}

function reviewTerm(forge) {
  // GitHub uses "PR" / "Pull Request"; GitLab uses "MR" / "Merge Request".
  if (forge === 'gitlab') return 'MR';
  return 'PR';
}

function checkCliAvailable(cli) {
  try {
    execSync(`${cli} --version`, { stdio: 'ignore' });
    return true;
  } catch (_) {
    return false;
  }
}

module.exports = { detectForge, pickCli, buildPrCommand, reviewTerm, checkCliAvailable };
