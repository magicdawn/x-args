import assert from 'node:assert'
import { execSync, type ExecSyncOptionsWithBufferEncoding } from 'node:child_process'
import path from 'node:path'
import chalk from 'chalk'
import { watch } from 'chokidar'
import Emittery from 'emittery'
import { delay, once } from 'es-toolkit'
import ms from 'ms'
import { quote } from 'shlex'
import superjson from 'superjson'
import { boxen, fse } from '../../libs'
import { parseLineToArgs } from '../../util/parse-line'
import type { TxtCommand } from '.'

// export for `startTxtCommand` args.sesssion
export enum SessionControl {
  Start = 'start',
  ReStart = 'restart',
  Continue = 'continue',
}

export type CommandBuilderContext = {
  // unquoted
  rawLine: string
  rawArgs: string[]
  // quoted
  line: string
  args: string[]
}

export function applyCommandTemplate(command: string, ctx: CommandBuilderContext) {
  const { rawLine, rawArgs, line, args } = ctx
  return command
    .replaceAll(/:rawLine/gi, rawLine)
    .replaceAll(/:line/gi, line)
    .replaceAll(/:rawArgs?(\d)/gi, (match, index) => rawArgs[index])
    .replaceAll(/:args?(\d)/gi, (match, index) => args[index])
}

export interface RunContext extends CommandBuilderContext {
  applyCommandTemplate: typeof applyCommandTemplate
  quote: typeof quote
  runCommandSync: (command: string) => void
}

export interface StartTxtCommandOptions extends Pick<TxtCommand, 'txt' | 'yes' | 'wait' | 'waitTimeout'> {
  session: SessionControl
  execOptions?: Partial<ExecSyncOptionsWithBufferEncoding>
  command?: string | ((ctx: CommandBuilderContext) => string)
  run?: (ctx: CommandBuilderContext) => void | Promise<void>
}

export const defaultTxtCommandContext = {
  session: SessionControl.Continue,
} satisfies Partial<StartTxtCommandOptions>

const lognsp = 'x-args:txt-command'

function assertCommandOrRun({ command, run }: Pick<StartTxtCommandOptions, 'command' | 'run'>) {
  assert(command || run, 'command and run cannot both be undefined')
}

export async function startTxtCommand(opts: StartTxtCommandOptions) {
  assertCommandOrRun(opts)
  const { txt, wait, waitTimeout, yes, command, execOptions, run } = opts
  const txtFile = path.resolve(txt)

  console.log('')
  console.log(`${chalk.green('[x-args]')}: received`)
  console.log(`   ${chalk.cyan('txt file')}: ${chalk.yellow(txtFile)}`)
  if (command && typeof command === 'string') console.log(`    ${chalk.cyan('command')}: ${chalk.yellow(command)}`)
  console.log('')

  const sessionControl = opts.session as SessionControl
  const sessionFile = path.join(path.dirname(txtFile), `.x-args-session.${path.basename(txtFile)}`)

  let processed = new Set<string>()

  if (sessionControl === SessionControl.Start) {
    if (fse.existsSync(sessionFile) && fse.readFileSync(sessionFile, 'utf8').length) {
      console.error(`session already exists, use \`${SessionControl.Continue}\` or \`${SessionControl.ReStart}\``)
      process.exit(1)
    }
  } else if (sessionControl === SessionControl.ReStart) {
    if (fse.existsSync(sessionFile)) {
      fse.removeSync(sessionFile)
    }
  } else if (sessionControl === SessionControl.Continue && fse.existsSync(sessionFile)) {
    const content = fse.readFileSync(sessionFile, 'utf8')
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
    const content = fse.readFileSync(txtFile, 'utf8')

    const lines = content
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => !(line.startsWith('//') || line.startsWith('#'))) // remove comment
      .filter((line) => !processed.has(line)) // remove already processed

    if (lines.length) return lines[0]
  }

  async function getLineThenRunCommand() {
    let worked = false
    let line: string | undefined
    while ((line = getTxtNextLine())) {
      worked = true
      await runSingleLine(line, { yes, command, run, execOptions })
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

  await getLineThenRunCommand()

  if (wait) {
    const emitter = new Emittery<{ change: undefined }>()
    const watcher = watch(txtFile).on('change', () => emitter.emit('change'))
    const unwatch = once(() => watcher.close())

    process.on('exit', unwatch)
    // 大多数情况下：不需要为了 unwatch 专门监听 SIGINT。
    // 只有当你的 unwatch 涉及“非自动释放资源”时，才有必要。
    // process.on('SIGINT', unwatch)
    // process.on('SIGTERM', unwatch)

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
      prevWorked = await getLineThenRunCommand()
    }

    // exit
    unwatch()
  }
}

async function runSingleLine(
  line: string,
  { yes, command, run, execOptions }: Pick<StartTxtCommandOptions, 'yes' | 'command' | 'run' | 'execOptions'>,
) {
  assertCommandOrRun({ command, run })
  const splitedArgs = parseLineToArgs(line)
  const commandBuilderContext: CommandBuilderContext = {
    rawLine: line,
    rawArgs: splitedArgs,
    line: quote(line),
    args: splitedArgs.map((x) => quote(x)),
  }

  // use callback function
  if (run) {
    const runContext: RunContext = {
      ...commandBuilderContext,
      applyCommandTemplate,
      quote,
      runCommandSync: (cmd) => execSync(cmd, { stdio: 'inherit', ...execOptions }),
    }
    console.log('')
    console.log(
      boxen(
        [
          `${chalk.green(' line =>')} ${chalk.yellow(line.padEnd(70, ' '))}`,
          `${chalk.green('  run =>')} ${chalk.yellow(run.name)}`,
        ].join('\n'),
        { borderColor: 'green', title: chalk.green(`${lognsp}:line`) },
      ),
    )
    if (yes) {
      await run(runContext)
    }
  }

  // spawn command
  else if (command) {
    const cmd =
      typeof command === 'string'
        ? applyCommandTemplate(command, commandBuilderContext)
        : command(commandBuilderContext)
    console.log('')
    console.log(
      boxen(
        [
          `${chalk.green(' line =>')} ${chalk.yellow(line.padEnd(70, ' '))}`,
          `${chalk.green('  cmd =>')} ${chalk.yellow(cmd)}`,
        ].join('\n'),
        { borderColor: 'green', title: chalk.green(`${lognsp}:line`) },
      ),
    )
    if (yes) {
      execSync(cmd, { stdio: 'inherit', ...execOptions })
    }
  }

  // none
  else {
    throw new Error('unexpected logic branch')
  }
}
