#!/usr/bin/env node

import { Builtins, Cli } from 'clipanion'
import { createRequire } from 'module'
import { PackageJson } from 'type-fest'
import { DefaultCommand } from './commands/default'
import { TxtCommand } from './commands/txt'

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

// run
cli.runExit(args, Cli.defaultContext)
