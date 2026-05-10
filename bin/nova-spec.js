#!/usr/bin/env node

const { run } = require('../lib/cli.js');

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
