import chalk from 'chalk'
import { execSync } from 'child_process'
import { Command, Option, Usage } from 'clipanion'
import globby from 'globby'
import path from 'path'
import { fse } from '../libs'
import { getFilenameTokens, printFilenameTokens, renderFilenameTokens } from '../util/file'

// e.g x-args ./some.txt -c $'himg c -d :line -q 80'
export class TxtCommand extends Command {
  static paths?: string[][] = [['txt']]

  static usage: Usage = {
    description: 'xargs txt <txt-file>, use `:arg` or `:line` as 1 line in txt file',
  }

  txt = Option.String({ name: 'txt', required: true })

  command = Option.String('-c,--command', {
    required: true,
    description: 'the command to execute',
  })

  // for safty
  yes = Option.Boolean('-y,--yes', false, {
    description: 'exec commands, default false(only preview commands, aka dry run)',
  })

  execute(): Promise<number | void> {
    return this.run()
  }

  async run() {
    const { txt, command } = this

    const txtFile = path.resolve(txt)

    console.log('')
    console.log(`${chalk.green('[x-args]')}: received`)
    console.log(` ${chalk.cyan('txt file')}: ${chalk.yellow(txtFile)}`)
    console.log(`  ${chalk.cyan('command')}: ${chalk.yellow(command)}`)
    console.log('')

    const processed = new Set<string>()

    // live edit support: start with 1 line
    const getTxtNextLine = () => {
      const content = fse.readFileSync(txtFile, 'utf8')

      const lines = content
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .filter((line) => !(line.startsWith('//') || line.startsWith('#'))) // remove comment
        .filter((line) => !processed.has(line)) // remove already processed

      if (lines.length) return lines[0]
    }

    let line: string
    while ((line = getTxtNextLine())) {
      const cmd = command.replace(/:arg/gi, line).replace(/:line/gi, line)
      console.log('')
      console.log('[txt:line] %s', line)
      console.log('[txt:line] cmd = %s', cmd)

      if (this.yes) {
        execSync(cmd, { stdio: 'inherit' })
      }

      processed.add(line)
    }
  }
}