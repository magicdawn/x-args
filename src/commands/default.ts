import chalk from 'chalk'
import { execSync } from 'child_process'
import { Command, Option, Usage } from 'clipanion'
import globby from 'globby'
import { BaseCommand } from '../util/BaseCommand'
import { getFilenameTokens, printFilenameTokens, renderFilenameTokens } from '../util/file'

// e.g x-args -f './*.*' -c $'cwebp :file -o \':dir/:name_compressed.:ext\''
export class DefaultCommand extends BaseCommand {
  static paths?: string[][] = [Command.Default]

  static usage: Usage = {
    description: 'xargs',
  }

  command = Option.String('-c,--command', {
    required: true,
    description: 'the command to execute',
  })

  execute(): Promise<number | void> {
    return this.run()
  }

  async run() {
    const { files, command } = this

    console.log('')
    console.log(`${chalk.green('[x-args]')}: received`)
    console.log(`  ${chalk.cyan('files')}: ${chalk.yellow(files)}`)
    console.log(`${chalk.cyan('command')}: ${chalk.yellow(command)}`)
    console.log('')

    const resolvedFiles = globby.sync(files, { caseSensitiveMatch: !this.ignoreCase })
    console.log(
      `${chalk.green('[globby]')}: docs ${chalk.blue(
        'https://github.com/mrmlnc/fast-glob#pattern-syntax'
      )}`
    )
    console.log(
      `${chalk.green('[globby]')}: mapping ${chalk.yellow(files)} to ${chalk.yellow(
        resolvedFiles.length
      )} files ->`
    )
    resolvedFiles.forEach((f) => {
      console.log(`  ${chalk.cyan(f)}`)
    })

    for (let item of resolvedFiles) {
      const tokens = getFilenameTokens(item)
      const usingCommand = renderFilenameTokens(this.command, tokens)

      console.log('')
      console.log(`${chalk.green('[exec]')} for ${chalk.yellow(item)}`)
      console.log(`  ${chalk.green('command')}: ${chalk.yellow(usingCommand)}`)
      if (this.showTokens) {
        printFilenameTokens(tokens)
      }

      if (this.yes) {
        execSync(usingCommand, { stdio: 'inherit' })
      }
    }

    if (!this.yes) {
      console.log('')
      console.log('-'.repeat(80))
      console.log(
        `  current ${chalk.yellow('previewing')} commands. After comfirmed, append ${chalk.green(
          '-y or --yes'
        )} flag to execute`
      )
      console.log('-'.repeat(80))
      console.log('')
    }
  }
}
