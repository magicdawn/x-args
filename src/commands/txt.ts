import chalk from 'chalk'
import { execSync } from 'child_process'
import { Command, Option, Usage } from 'clipanion'
import delay from 'delay'
import { isEqual } from 'lodash-es'
import CircularBuffer from 'mnemonist/circular-buffer.js'
import ms from 'ms'
import path from 'path'
import shellEscape from 'shell-escape'
import superjson from 'superjson'
import { z } from 'zod'
import { boxen, fse } from '../libs'

function inspectArray(arr: any[]) {
  return arr.map((x) => '`' + x.toString() + '`').join(' | ')
}

// e.g x-args ./some.txt -c $'himg c -d :line -q 80'
export class TxtCommand extends Command {
  static paths?: string[][] = [['txt']]

  static usage: Usage = {
    description:
      'xargs txt <txt-file>, use `:line` as placeholder of a line of txt file, use  (`:arg0` or `:args0`) ... to replace a single value',
  }

  txt = Option.String({ name: 'txt', required: true })

  command = Option.String('-c,--command', {
    required: true,
    description: 'the command to execute',
  })

  argsSplit = Option.String('-s,--split,--args-split', String.raw`/\s+/`, {
    description: `char to split a line, type: regex or string; default: ${String.raw`/\s+/`};`,
  })

  // for safty
  yes = Option.Boolean('-y,--yes', false, {
    description: 'exec commands, default false(only preview commands, aka dry run)',
  })

  wait = Option.Boolean('-w,--wait', false, {
    description: 'wait new items when queue empty',
  })

  waitTimeout = Option.String('--wait-timeout,--WT', {
    description: 'wait timeout, will pass to ms()',
  })

  session = Option.String('--session', SessionControl.Continue, {
    description: `session handling: default \`${SessionControl.Continue}\`; allowed values: ${inspectArray(Object.values(SessionControl))};`,
  })

  execute(): Promise<number | void> {
    let argsSplit: TxtCommandArgs['argsSplit'] = this.argsSplit
    if (argsSplit.startsWith('/') && argsSplit.endsWith('/')) {
      argsSplit = new RegExp(argsSplit.slice(1, -1))
    }
    return startTxtCommand({
      ...this,
      session: z.nativeEnum(SessionControl).parse(this.session),
    })
  }
}

// export for `startTxtCommand` args.sesssion
export enum SessionControl {
  Start = 'start',
  ReStart = 'restart',
  Continue = 'continue',
}

export type TxtCommandArgs = Pick<
  TxtCommand,
  'txt' | 'command' | 'yes' | 'wait' | 'waitTimeout'
> & { session: SessionControl; argsSplit: string | RegExp }

const lognsp = 'x-args:txt-command'

export async function startTxtCommand(args: TxtCommandArgs) {
  const { txt, command, argsSplit, wait, waitTimeout, yes } = args

  const txtFile = path.resolve(txt)

  console.log('')
  console.log(`${chalk.green('[x-args]')}: received`)
  console.log(`   ${chalk.cyan('txt file')}: ${chalk.yellow(txtFile)}`)
  console.log(` ${chalk.cyan('args split')}: ${chalk.yellow('`' + argsSplit + '`')}`)
  console.log(`    ${chalk.cyan('command')}: ${chalk.yellow(command)}`)
  console.log('')

  const sessionControl = args.session as SessionControl
  const sessionFile = path.join(path.dirname(txtFile), `.x-args-session.${path.basename(txtFile)}`)

  let processed = new Set<string>()

  if (sessionControl === SessionControl.Start) {
    if (fse.existsSync(sessionFile) && fse.readFileSync(sessionFile, 'utf-8').length) {
      console.error(
        `session already exists, use \`${SessionControl.Continue}\` or \`${SessionControl.ReStart}\``,
      )
      process.exit(1)
    }
  } else if (sessionControl === SessionControl.ReStart) {
    if (fse.existsSync(sessionFile)) {
      fse.removeSync(sessionFile)
    }
  } else if (sessionControl === SessionControl.Continue) {
    if (fse.existsSync(sessionFile)) {
      const content = fse.readFileSync(sessionFile, 'utf-8')
      if (content) {
        let _processed: Set<string> | undefined
        try {
          const parsed = superjson.parse<{ processed: Set<string> }>(content)
          _processed = parsed.processed
        } catch (e) {
          // noop
        }
        if (_processed) {
          processed = new Set(_processed)
          console.info(`${chalk.green(`[${lognsp}:session]`)} loaded from file %s`, sessionFile)
        }
      }
    }
  }

  function saveProcessed() {
    fse.outputFileSync(sessionFile, superjson.stringify({ processed }))
  }

  // live edit support: start with 1 line
  function getTxtNextLine() {
    const content = fse.readFileSync(txtFile, 'utf8')

    const lines = content
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => !(line.startsWith('//') || line.startsWith('#'))) // remove comment
      .filter((line) => !processed.has(line)) // remove already processed

    if (lines.length) return lines[0]
  }

  function getLineThenRunCommand() {
    let line: string | undefined
    while ((line = getTxtNextLine())) {
      let splitedArgs = line.split(argsSplit)

      let cmd = command
      cmd = cmd.replace(/:args?(\d)/gi, (match, index) => {
        return splitedArgs[index] ? shellEscape([splitedArgs[index]]) : ''
      })
      cmd = cmd.replace(/:line/gi, shellEscape([line]))

      console.log('')
      console.log(
        boxen(
          [
            //
            `${chalk.green(' line =>')} ${chalk.yellow(line.padEnd(70, ' '))}`,
            `${chalk.green('  cmd =>')} ${chalk.yellow(cmd)}`,
          ].join('\n'),
          {
            borderColor: 'green',
            title: chalk.green(`${lognsp}:line`),
          },
        ),
      )

      if (yes) {
        execSync(cmd, { stdio: 'inherit' })
      }

      processed.add(line)
      saveProcessed()
      setProgramExitTs()
    }
  }

  const waitTimeoutMs = waitTimeout ? ms(waitTimeout) : 0
  if (isNaN(waitTimeoutMs)) {
    throw new Error('unrecognized --wait-timeout format, pls check https://npm.im/ms')
  }

  let exitTs = Infinity
  function setProgramExitTs() {
    if (waitTimeout) {
      exitTs = Date.now() + waitTimeoutMs
    }
  }

  getLineThenRunCommand()

  if (wait) {
    const q = new CircularBuffer<boolean>(Array, 2)
    q.push(true)

    while (Date.now() <= exitTs) {
      await delay(2_000)

      const hasLine = !!getTxtNextLine()
      q.push(hasLine)

      if (hasLine) {
        getLineThenRunCommand()
      } else {
        // print only when [true,false]
        const shouldPrint = isEqual(q.toArray(), [true, false])
        if (shouldPrint) {
          console.log()
          console.info(`${chalk.green(`[${lognsp}:wait]`)} no new items, waiting for changes ...`)
          console.log()
        }
      }
    }
  }
}
