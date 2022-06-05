#!/usr/bin/env node

const dev = require('fs').existsSync(__dirname + '/.dev')

if (dev) {
  require('ts-node').register({ project: __dirname + '/../tsconfig.json' })
  require('../src/bin')
} else {
  require('../lib/bin')
}
