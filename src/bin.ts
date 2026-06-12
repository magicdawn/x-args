#!/usr/bin/env node

import { Builtins, Cli } from 'clipanion'
import { name, version } from '../package.json'
import { DefaultCommand } from './commands/default'
import { RunInPlatypusCommand } from './commands/run-in-platypus'
import { TxtCommand } from './commands/txt-command'

const [node, app, ...args] = process.argv
const cli = new Cli({
  binaryLabel: name,
  binaryName: 'x-args',
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
