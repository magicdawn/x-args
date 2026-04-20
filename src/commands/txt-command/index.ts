import { Command, Option, type Usage } from 'clipanion'
import { z } from 'zod'
import { SessionControl, startTxtCommand } from './api'

function inspectArray(arr: any[]) {
  return arr.map((x) => `\`${x.toString()}\``).join(' | ')
}

// e.g x-args ./some.txt -c $'himg c -d :line -q 80'
export class TxtCommand extends Command {
  static override paths?: string[][] = [['txt']]

  static override usage: Usage = {
    description:
      'xargs txt <txt-file>, use `:line` as placeholder of a line of txt file, use  (`:arg0` or `:args0`) ... to replace a single value',
  }

  txtFiles = Option.Rest({ name: 'txt-files', required: 1 })

  command = Option.String('-c,--command', {
    required: true,
    description: 'the command to execute',
  })

  // argsSplit = Option.String('-s,--split,--args-split', defaultTxtCommandArgs.argsSplit.toString(), {
  //   description: `char to split a line, type: regex or string; default: ${defaultTxtCommandArgs.argsSplit.toString()};`,
  // })

  // for safty
  yes = Option.Boolean('-y,--yes', false, {
    description: 'exec commands, default false(only preview commands, aka dry run)',
  })

  wait = Option.Boolean('-w,--wait', false, {
    description: 'wait new items when queue empty',
  })

  waitTimeout? = Option.String('--wait-timeout,--WT', {
    description: 'wait timeout, will pass to ms()',
  })

  session = Option.String('--session', SessionControl.Continue, {
    description: `session handling: default \`${SessionControl.Continue}\`; allowed values: ${inspectArray(Object.values(SessionControl))};`,
  })

  execute(): Promise<number | void> {
    return startTxtCommand({
      ...this,
      session: z.enum(SessionControl).parse(this.session),
    })
  }
}
