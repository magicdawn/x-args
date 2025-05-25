#!/usr/bin/env node

import { createRequire } from 'node:module'
import { Builtins, Cli } from 'clipanion'
import { DefaultCommand } from './commands/default'
import { RunInPlatypusCommand } from './commands/run-in-platypus'
import { TxtCommand } from './commands/txt'
import type { PackageJson } from 'type-fest'

const require = createRequire(import.meta.url)
const { version, name, bin } = require('../package') as PackageJson

const [node, app, ...args] = process.argv
const cli = new Cli({
  binaryLabel: name,
  binaryName: Object.keys(bin as Record<string, string>)[0],
  binaryVersion: version,
})

cli.register(Builtins.HelpCommand)
cli.register(Builtins.VersionCommand)
cli.register(Builtins.DefinitionsCommand)

// more commands
cli.register(TxtCommand)
cli.register(DefaultCommand)
cli.register(RunInPlatypusCommand)

// run
cli.runExit(args, Cli.defaultContext)
