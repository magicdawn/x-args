import assert from 'node:assert'
import { execSync, type ExecSyncOptionsWithBufferEncoding } from 'node:child_process'
import path from 'node:path'
import { Result } from 'better-result'
import chalk from 'chalk'
import { watch } from 'chokidar'
import { debounce, noop, once, pick, uniq } from 'es-toolkit'
import logSymbols from 'log-symbols'
import ms from 'ms'
import PQueue from 'p-queue'
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
  /** current line  */
  line: string
  /** args split from line */
  args: string[]
  /** helper: apply command template */
  applyCommandTemplate: typeof applyCommandTemplate
  /** helper: shlex.quote */
  quote: typeof quote
}

export function applyCommandTemplate(command: string, { line, args }: Pick<CommandBuilderContext, 'line' | 'args'>) {
  return command
    .replaceAll(/:rawLine/gi, line)
    .replaceAll(/:line/gi, quote(line))
    .replaceAll(/:rawArgs?(\d)/gi, (_, index) => args[index])
    .replaceAll(/:args?(\d)/gi, (_, index) => quote(args[index]))
}

export interface RunContext extends CommandBuilderContext {
  /** shortcut for `execSync`  */
  runCommandSync: (command: string) => void
  /** the txt file being processed */
  txtFile: string
}

export interface StartTxtCommandOptions extends Pick<TxtCommand, 'yes' | 'wait' | 'waitTimeout'> {
  txtFiles: string | string[]
  session: SessionControl
  execOptions?: Partial<ExecSyncOptionsWithBufferEncoding>
  command?: string | ((ctx: CommandBuilderContext) => string)
  run?: (ctx: RunContext) => void | Promise<void>
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
  const { wait, waitTimeout } = opts
  const waitTimeoutMs = waitTimeout ? ms(waitTimeout as ms.StringValue) : Infinity
  if (Number.isNaN(waitTimeoutMs)) {
    throw new TypeError('unrecognized --wait-timeout format, pls check https://npm.im/ms')
  }

  // multi txt-files
  const txtFiles = uniq([opts.txtFiles].flat().map((x) => path.resolve(x)))

  // check --session argv
  for (const txtFile of txtFiles) {
    new TxtFileSessionController(txtFile).run(opts.session)
  }

  // first run
  const queue = new PQueue({ concurrency: 1 })
  const drainConfig = pick(opts, ['yes', 'command', 'run', 'execOptions'])
  queue.addAll(txtFiles.map((x) => () => drainSingleTxtFile(x, drainConfig)))
  if (!wait) {
    await queue.onIdle()
  }

  // wait
  if (wait) {
    const watcher = watch(txtFiles).on('change', (changedFile) => {
      queue.add(() => drainSingleTxtFile(changedFile, drainConfig))
    })
    const unwatch = once(() => watcher.close())
    process.on('exit', unwatch)
    // 大多数情况下：不需要为了 unwatch 专门监听 SIGINT。只有当你的 unwatch 涉及“非自动释放资源”时，才有必要。
    // process.on('SIGINT', unwatch)
    // process.on('SIGTERM', unwatch)

    const { promise, resolve } = Promise.withResolvers<void>()

    const printIdleInfo = debounce(() => {
      if (queue.pending === 0 && queue.size === 0) {
        console.log(`\n${logSymbols.info}: Queue ${chalk.green('Idle')}, Waiting for changes to:`)
        txtFiles.forEach((x) => {
          console.log(`   📝 %s`, x)
        })
      }
    }, 2000)
    const scheduleExit = debounce(() => {
      printIdleInfo.cancel()
      scheduleExit.cancel()
      unwatch()
      resolve()
    }, waitTimeoutMs)

    queue
      .on('idle', () => {
        printIdleInfo()
        if (Number.isFinite(waitTimeoutMs)) scheduleExit()
      })
      .on('active', () => {
        printIdleInfo.cancel()
        scheduleExit.cancel()
      })

    return promise
  }
}

export class TxtFileSessionController {
  sessionFile: string
  constructor(public txtFile: string) {
    this.sessionFile = path.join(path.dirname(txtFile), `.x-args-session.${path.basename(txtFile)}`)
  }

  // #region storage
  load = () => {
    let processedLines = new Set<string>()
    if (fse.existsSync(this.sessionFile)) {
      const content = fse.readFileSync(this.sessionFile, 'utf8')
      if (content) {
        const result = Result.try(() => superjson.parse<{ processed: Set<string> }>(content))
        if (result.isErr()) {
          console.error(`${logSymbols.error}: failed to parse broken session file: %s`, this.sessionFile)
        } else {
          processedLines = new Set(result.value.processed)
          console.info(`${chalk.green(`[${lognsp}:session]`)} loaded from file %s`, this.sessionFile)
        }
      }
    }
    return processedLines
  }
  save = (processedLines: Set<string>) => {
    fse.outputFileSync(this.sessionFile, superjson.stringify({ processed: processedLines }))
  }
  // #endregion

  // #region actions
  run = (action: SessionControl) => this[action]()
  private start = () => {
    assert(
      this.load().size === 0,
      `session already exists, use \`${SessionControl.Continue}\` or \`${SessionControl.ReStart}\``,
    )
  }
  private restart = () => {
    fse.outputFileSync(this.sessionFile, '')
  }
  private continue = noop
  // #endregion
}

export async function drainSingleTxtFile(
  txtFile: string,
  { yes, command, run, execOptions }: Pick<StartTxtCommandOptions, 'yes' | 'command' | 'run' | 'execOptions'>,
) {
  console.log('')
  console.log(`${chalk.green(`${lognsp}:drainSingleTxtFile`)} =>`)
  console.log(`   ${chalk.cyan('txt file')}: ${chalk.yellow(txtFile)}`)
  if (command && typeof command === 'string') console.log(`    ${chalk.cyan('command')}: ${chalk.yellow(command)}`)
  console.log('')

  const sessionCtrl = new TxtFileSessionController(txtFile)
  const processedLines = sessionCtrl.load()
  const saveProcessed = () => sessionCtrl.save(processedLines)

  let line: string | undefined
  while ((line = getTxtFileNextLine(txtFile, processedLines))) {
    await runSingleLine(txtFile, line, { yes, command, run, execOptions })
    processedLines.add(line)
    if (yes) {
      saveProcessed()
    }
  }
}

// live edit support: start with 1 line
function getTxtFileNextLine(txtFile: string, processedLines: Set<string>) {
  const content = fse.readFileSync(txtFile, 'utf8')
  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !(line.startsWith('//') || line.startsWith('#'))) // remove comment
    .filter((line) => !processedLines.has(line)) // remove already processed
  if (lines.length) return lines[0]
}

async function runSingleLine(
  txtFile: string,
  line: string,
  { yes, command, run, execOptions }: Pick<StartTxtCommandOptions, 'yes' | 'command' | 'run' | 'execOptions'>,
) {
  assertCommandOrRun({ command, run })
  const splitedArgs = parseLineToArgs(line)
  const commandBuilderContext: CommandBuilderContext = {
    applyCommandTemplate,
    quote,
    line,
    args: splitedArgs,
  }

  const runCommandSync = (cmd: string) =>
    execSync(cmd, {
      stdio: 'inherit',
      cwd: path.dirname(txtFile), // set default cwd to txt file
      ...execOptions,
    })

  const headerBox = (cmdOrRun: string) => {
    return boxen(
      [
        `${chalk.green(' file =>')} ${chalk.yellow(txtFile.padEnd(70, ' '))}`,
        `${chalk.green(' line =>')} ${chalk.yellow(line.padEnd(70, ' '))}`,
        cmdOrRun,
      ].join('\n'),
      {
        borderColor: 'green',
        title: chalk.green(`${lognsp}:runSingleLine`), // TODO: check out
      },
    )
  }

  // use in-process callback
  if (run) {
    const runContext: RunContext = { ...commandBuilderContext, runCommandSync, txtFile }
    console.log('')
    console.log(headerBox(`${chalk.green('  run =>')} <funciton ${chalk.yellow(run.name)}>`))
    if (yes) {
      await run(runContext)
    }
  }

  // spawn external command
  else if (command) {
    const cmd =
      typeof command === 'string'
        ? applyCommandTemplate(command, commandBuilderContext)
        : command(commandBuilderContext)
    console.log('')
    console.log(headerBox(`${chalk.green('  cmd =>')} ${chalk.yellow(cmd)}`))
    if (yes) {
      runCommandSync(cmd)
    }
  }

  // none
  else {
    throw new Error('unexpected logic branch')
  }
}
