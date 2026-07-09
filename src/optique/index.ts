import { message, object, option, string, withDefault } from '@optique/core'
import { runProgram } from '@optique/discover'
import { defineCommand } from '@optique/discover/command'

const defaultCommand = defineCommand({
  path: ['files'],
  metadata: {
    brief: message`files as input`,
  },
  parser: object({
    files: option('-f', '--files', string({ metavar: 'GLOB' }), {
      description: message`files as input`,
    }),
    ignoreCase: withDefault(
      option('--ignore-case', { description: message`ignore case for -f,--files, default true` }),
      true,
    ),
    globCwd: option('--glob-cwd', string({ metavar: 'DIR' }), {
      description: message`cwd used in glob`,
    }),
  }),
  handler(value) {
    console.log('value=', value)
  },
})

runProgram({
  commands: [defaultCommand],
  metadata: {
    name: 'x-args',
  },
  help: 'option',
})
