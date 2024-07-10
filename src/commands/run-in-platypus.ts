import boxen from 'boxen'
import { Command, Option, type Usage } from 'clipanion'
import delay from 'delay'
import { execaSync, ExecaSyncError, type SyncResult } from 'execa'

/**
 * what's this: https://github.com/sveinbjornt/Platypus/issues/274
 */
export class RunInPlatypusCommand extends Command {
  static paths?: string[][] | undefined = [['run-in-platypus'], ['platypus']]
  static usage: Usage = {
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

    let err: Error | undefined
    let result: SyncResult | undefined
    try {
      result = execaSync({ shell: true, stdio: 'inherit' })`${this.args}`
    } catch (e) {
      err = e as Error
    }

    if (err instanceof ExecaSyncError) {
      if (err.isTerminated) {
        // SIGFPE 'Floating point arithmetic error'
        console.error(
          '[RunInPlatypusCommand] terminated: signal => %s, signalDescription => %s',
          err.signal,
          err.signalDescription,
        )
        throw err
      }
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
      console.log('ALERT:Error|' + (err.stack || err.message || '').split('\n')[0])
      console.log()

      // The maximum value for a 32-bit signed integer is 2147483647 milliseconds, which is roughly 24.8 days.
      while (true) {
        await delay(2147483647)
      }
    }
  }
}
