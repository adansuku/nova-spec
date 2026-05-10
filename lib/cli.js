'use strict';

const { init } = require('./installer.js');
const { sync } = require('./sync.js');

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
    default:
      console.error(`Unknown command: ${command}`);
      console.error('Usage: nova-spec [init|sync]');
      process.exit(1);
  }
}

module.exports = { run };
