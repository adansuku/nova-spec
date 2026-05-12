'use strict';

const fs = require('fs');
const { writeAtomic } = require('./sync.js');

// Each migration is { from: 'X.Y', to: 'X.Y', apply: (text) => text }.
// They run in order; each one transforms the YAML text. Idempotent — applying
// twice produces the same result. Detection is heuristic (presence/absence of
// keys), not a version field, so old configs without `_schema:` migrate cleanly.
const MIGRATIONS = [
  {
    name: 'add-forge-section',
    detect: (text) => !/^forge:/m.test(text),
    apply: (text) => {
      const block = [
        '',
        'forge:',
        '  type: auto              # auto | github | gitlab',
        '  cli: auto               # auto | gh | glab',
      ].join('\n');
      return text.trimEnd() + '\n' + block + '\n';
    },
  },
  {
    name: 'rename-done-transition-id',
    detect: (text) => /^\s*done_transition_id:/m.test(text) && !/^\s*transitions:/m.test(text),
    apply: (text) => {
      // Move done_transition_id under jira.transitions.done while keeping the
      // legacy key as fallback so older skills don't break mid-migration.
      // The value capture is intentionally non-greedy and strips trailing
      // whitespace + an optional inline `# comment` so users who hand-edited
      // the file with annotations don't get their comment merged into the value.
      return text.replace(
        /^(\s*)done_transition_id:\s*"?([^"#\n]+?)"?\s*(?:#[^\n]*)?$/m,
        (_, indent, value) =>
          `${indent}done_transition_id: "${value.trim()}"\n${indent}transitions:\n${indent}  done: "${value.trim()}"`,
      );
    },
  },
  {
    name: 'rename-transitions-done-to-on-pr',
    // Semantic shift: /nova-wrap moves the ticket when the PR is OPENED
    // (→ "Code Review"), not when it merges. Merging-to-Done is handled by
    // Jira's native forge integration. Existing configs have a `done:` key
    // here that was misnamed — add `on_pr:` mirroring it, keep `done:` as
    // legacy fallback.
    detect: (text) =>
      /^\s+done:\s*"?[^"\n]+"?\s*$/m.test(text) && !/^\s+on_pr:/m.test(text),
    apply: (text) => {
      return text.replace(
        /^(\s+)done:\s*("?[^"\n]+"?)\s*$/m,
        (_, indent, value) =>
          `${indent}on_pr: ${value}    # used by /nova-wrap → "Code Review"\n${indent}done: ${value}    # legacy; Jira moves to Done on merge via forge integration`,
      );
    },
  },
];

function migrateConfig(configPath) {
  if (!fs.existsSync(configPath)) return { applied: [] };

  const original = fs.readFileSync(configPath, 'utf8');
  let current = original;
  const applied = [];

  for (const migration of MIGRATIONS) {
    if (migration.detect(current)) {
      current = migration.apply(current);
      applied.push(migration.name);
    }
  }

  if (current !== original) {
    writeAtomic(configPath, current);
  }

  return { applied };
}

module.exports = { migrateConfig, MIGRATIONS };
