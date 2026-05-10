'use strict';

const fs = require('fs');

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
      return text.replace(
        /^(\s*)done_transition_id:\s*"?([^"\n]+)"?\s*$/m,
        (_, indent, value) =>
          `${indent}done_transition_id: "${value}"\n${indent}transitions:\n${indent}  done: "${value}"`,
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
    fs.writeFileSync(configPath, current);
  }

  return { applied };
}

module.exports = { migrateConfig, MIGRATIONS };
