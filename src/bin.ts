#!/usr/bin/env node

import { Builtins, Cli } from 'clipanion'
import esmUtils from 'esm-utils'
import { PackageJson } from 'type-fest'

const { require } = esmUtils(import.meta)
const { version, name, bin } = require('../package') as PackageJson

const [node, app, ...args] = process.argv
const cli = new Cli({
  binaryLabel: name,
  binaryName: Object.keys(bin)[0],
  binaryVersion: version,
})

cli.register(Builtins.HelpCommand)
cli.register(Builtins.VersionCommand)
cli.register(Builtins.DefinitionsCommand)

// more commands
import { DefaultCommand } from './commands/default'
import { TxtCommand } from './commands/txt'
cli.register(TxtCommand)
cli.register(DefaultCommand)

// run
cli.runExit(args, Cli.defaultContext)
