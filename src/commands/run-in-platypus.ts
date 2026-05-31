import { Result } from 'better-result'
import boxen from 'boxen'
import { Command, Option, type Usage } from 'clipanion'
import { delay } from 'es-toolkit'
import { execaSync, ExecaSyncError } from 'execa'

/**
 * what's this: https://github.com/sveinbjornt/Platypus/issues/274
 */
export class RunInPlatypusCommand extends Command {
  static override paths?: string[][] | undefined = [['run-in-platypus'], ['platypus']]
  static override usage: Usage = {
    description: 'run command in platypus',
  }

  args = Option.Proxy({
    name: 'the command you want to proxy',
  })

  async execute(): Promise<number | void> {
    if (this.args[0] === '--') {
      this.args.shift()
    }
    console.log('[RunInPlatypusCommand] args = %O', this.args)

    // NOTE: this can also be done/escaped with `child_process.execSync(escapeShellArgs(this.args))`
    // execa has signal handling, don't know is it useful, let's see

    // if your original command is `foo --bar baz`, can `foo` is in $PATH
    // `x-args run-in-platypus -- foo --bar baz` is OK, $PATH is inherited
    // no shell: since `this.args` may contains `$PF` / `$QS`, should not be treated as shell variable

    const execResult = Result.try(() => {
      return execaSync({
        stdio: 'inherit',
        env: { RUN_IN_PLATYPUS: 'true' },
      })`${this.args}`
    })

    if (execResult.isErr()) {
      const err = execResult.error.cause as any

      if (err instanceof ExecaSyncError && err.isTerminated) {
        // SIGFPE 'Floating point arithmetic error'
        console.error(
          '[RunInPlatypusCommand] terminated: signal => %s, signalDescription => %s',
          err.signal,
          err.signalDescription,
        )
        throw err
      }

      // do not quit when error
      if (err) {
        console.log()
        console.log(boxen('↓↓↓ [RunInPlatypusCommand] error happens', { padding: 1 }))
        console.error(err.stack || err)
        console.log()

        // ALERT:Hello|World\n
        // NOTIFICATION:My title|My text\n
        console.log()
        console.log(`ALERT:Error|${(err.stack || err.message || '').split('\n')[0]}`)
        console.log()

        // The maximum value for a 32-bit signed integer is 2147483647 milliseconds, which is roughly 24.8 days.
        while (true) {
          await delay(2147483647)
        }
      }
    }
  }
}
