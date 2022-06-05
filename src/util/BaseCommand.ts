import { Command, Option } from 'clipanion'

export abstract class BaseCommand extends Command {
  /**
   * glob
   */
  files = Option.String('-f,--files', {
    required: true,
    description: 'files as input',
  })
  ignoreCase = Option.Boolean('--ignore-case', true, {
    description: 'ignore case for -f,--files, default true',
  })
  globCwd = Option.String('--glob-cwd', {
    description: 'cwd used in glob',
  })

  // for safty
  yes = Option.Boolean('-y,--yes', false, {
    description: 'exec commands, default false(only preview commands, aka dry run)',
  })

  // for tokens
  showTokens = Option.Boolean('-t,--tokens,--show-tokens', false, {
    description: 'show available tokens',
  })

  abstract execute(): Promise<number | void>
}
