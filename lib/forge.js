'use strict';

const { execSync } = require('child_process');

function classifyRemote(remote) {
  if (!remote) return null;
  if (/github\.com[:/]/i.test(remote)) return 'github';
  if (/gitlab[.-][\w.-]+[:/]|gitlab\.com[:/]/i.test(remote)) return 'gitlab';
  if (/bitbucket\.org[:/]/i.test(remote)) return 'bitbucket';
  return null;
}

function detectForge(cwd = process.cwd()) {
  // Try `origin` first (the common case).
  try {
    const remote = execSync('git remote get-url origin', {
      cwd,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
    const hit = classifyRemote(remote);
    if (hit) return hit;
  } catch (_) {
    // fall through to multi-remote scan
  }

  // Fallback: walk every remote URL. Useful for fork workflows where the
  // primary remote is named `upstream` or `gh` instead of `origin`.
  try {
    const lines = execSync('git remote -v', { cwd, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .split('\n');
    for (const line of lines) {
      const m = line.match(/^\S+\s+(\S+)\s+\((fetch|push)\)$/);
      if (!m) continue;
      const hit = classifyRemote(m[1]);
      if (hit) return hit;
    }
  } catch (_) {
    /* not a git repo or git not available */
  }

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
    // NOTE: Avoid `--fill` because it can trigger glab autofill/push behavior depending on user config.
    // We always pass title/body explicitly, and we never implicitly push.
    return `glab mr create --target-branch ${q(base)} --title ${q(title)} --description ${q(body)} --yes`;
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
