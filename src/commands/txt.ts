import { execSync, type ExecSyncOptionsWithBufferEncoding } from 'node:child_process'
import path from 'node:path'
import chalk from 'chalk'
import { watch } from 'chokidar'
import { Command, Option } from 'clipanion'
import Emittery from 'emittery'
import { delay, once } from 'es-toolkit'
import ms from 'ms'
import { escapeShellArg } from 'needle-kit'
import superjson from 'superjson'
import { z } from 'zod'
import { boxen, fse } from '../libs'
import { parseLineToArgs } from '../util/parse-line'
import type { Usage } from 'clipanion'

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

  txt = Option.String({ name: 'txt', required: true })

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

export type TxtCommandContext = Pick<TxtCommand, 'txt' | 'command' | 'yes' | 'wait' | 'waitTimeout'> & {
  session: SessionControl
  execOptions?: Partial<ExecSyncOptionsWithBufferEncoding>
}

export const defaultTxtCommandContext = {
  session: SessionControl.Continue,
} satisfies Partial<TxtCommandContext>

const lognsp = 'x-args:txt-command'

export async function startTxtCommand(ctx: TxtCommandContext) {
  const { txt, command, wait, waitTimeout, yes, execOptions } = ctx

  const txtFile = path.resolve(txt)

  console.log('')
  console.log(`${chalk.green('[x-args]')}: received`)
  console.log(`   ${chalk.cyan('txt file')}: ${chalk.yellow(txtFile)}`)
  console.log(`    ${chalk.cyan('command')}: ${chalk.yellow(command)}`)
  console.log('')

  const sessionControl = ctx.session as SessionControl
  const sessionFile = path.join(path.dirname(txtFile), `.x-args-session.${path.basename(txtFile)}`)

  let processed = new Set<string>()

  if (sessionControl === SessionControl.Start) {
    if (fse.existsSync(sessionFile) && fse.readFileSync(sessionFile, 'utf-8').length) {
      console.error(`session already exists, use \`${SessionControl.Continue}\` or \`${SessionControl.ReStart}\``)
      process.exit(1)
    }
  } else if (sessionControl === SessionControl.ReStart) {
    if (fse.existsSync(sessionFile)) {
      fse.removeSync(sessionFile)
    }
  } else if (sessionControl === SessionControl.Continue && fse.existsSync(sessionFile)) {
    const content = fse.readFileSync(sessionFile, 'utf-8')
    if (content) {
      let _processed: Set<string> | undefined
      try {
        const parsed = superjson.parse<{ processed: Set<string> }>(content)
        _processed = parsed.processed
      } catch {
        // noop
      }
      if (_processed) {
        processed = new Set(_processed)
        console.info(`${chalk.green(`[${lognsp}:session]`)} loaded from file %s`, sessionFile)
      }
    }
  }

  function saveProcessed() {
    fse.outputFileSync(sessionFile, superjson.stringify({ processed }))
  }

  // live edit support: start with 1 line
  function getTxtNextLine() {
    const content = fse.readFileSync(txtFile, 'utf-8')

    const lines = content
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => !(line.startsWith('//') || line.startsWith('#'))) // remove comment
      .filter((line) => !processed.has(line)) // remove already processed

    if (lines.length) return lines[0]
  }

  function getLineThenRunCommand() {
    let worked = false
    let line: string | undefined
    while ((line = getTxtNextLine())) {
      worked = true

      const splitedArgs = parseLineToArgs(line)
      const cmd = command
        .replaceAll(/:rawLine/gi, line)
        .replaceAll(/:line/gi, escapeShellArg(line))
        .replaceAll(/:rawArgs?(\d)/gi, (match, index) => splitedArgs[index] || '')
        .replaceAll(/:args?(\d)/gi, (match, index) => (splitedArgs[index] ? escapeShellArg(splitedArgs[index]) : ''))

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
        execSync(cmd, { stdio: 'inherit', ...execOptions })
      }

      processed.add(line)

      if (yes) {
        saveProcessed()
        setProgramExitTs()
      }
    }
    return worked
  }

  const waitTimeoutMs = waitTimeout ? ms(waitTimeout as ms.StringValue) : 0
  if (Number.isNaN(waitTimeoutMs)) {
    throw new TypeError('unrecognized --wait-timeout format, pls check https://npm.im/ms')
  }

  let exitTs = Infinity
  function setProgramExitTs() {
    if (waitTimeout) {
      exitTs = Date.now() + waitTimeoutMs
    }
  }

  getLineThenRunCommand()

  if (wait) {
    const emitter = new Emittery<{ change: undefined }>()
    const watcher = watch(txtFile).on('change', () => emitter.emit('change'))
    const unwatch = once(() => watcher.close())
    process.on('SIGINT', unwatch)
    process.on('SIGTERM', unwatch)
    process.on('exit', unwatch)

    function waitChanged() {
      return Promise.race(
        [emitter.once('change'), waitTimeoutMs ? delay(waitTimeoutMs + 1000) : undefined].filter(Boolean),
      )
    }

    function printNoNewItems() {
      console.log()
      console.info(`${chalk.green(`[${lognsp}:wait]`)} no new items, waiting for changes ...`)
      console.log()
    }

    let prevWorked = true
    while (Date.now() <= exitTs) {
      if (prevWorked) {
        const hasNewLine = !!getTxtNextLine()
        if (!hasNewLine) printNoNewItems()
      }
      await waitChanged()
      prevWorked = getLineThenRunCommand()
    }

    // exit
    unwatch()
  }
}
