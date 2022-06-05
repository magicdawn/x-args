import chalk from 'chalk'
import { execSync } from 'child_process'
import { Command, Option, Usage } from 'clipanion'
import globby from 'globby'
import path from 'path'

// e.g x-args -f './*.*' -c $'cwebp :file -o \':dir/:name_compressed.:ext\''
export class DefaultCommand extends Command {
  static paths?: string[][] = [Command.Default]

  static usage: Usage = {
    description: 'xargs',
  }

  files = Option.String('-f, --files', {
    required: true,
    description: 'files as input',
  })

  command = Option.String('-c, --command', {
    required: true,
    description: 'the command to execute',
  })

  // for safty
  yes = Option.Boolean('-y, --yes', false, {
    description: 'exec commands, default is false (only preview commands)',
  })

  // for tags
  showTags = Option.Boolean('-t, --tags, --show-tags', false, {
    description: 'show available tags',
  })

  ignoreCase = Option.Boolean('--ignore-case', true, {
    description: 'ignore case for -f, --files, default true',
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
      // /foo/bar/baz.xyz
      const fullpath = path.resolve(item)
      const dir = path.dirname(fullpath) // /foo/bar/
      const file = path.basename(fullpath) // baz.xyz
      let ext = path.extname(fullpath) // .xyz
      const name = path.basename(fullpath, ext) // baz
      ext = ext.slice(1) // remove . => xyz
      const pdir = path.basename(dir) // bar
      const rname = item // relative filename

      const usingCommand = getUsingCommand(this.command, {
        fullpath,
        dir,
        file,
        name,
        ext,
        pdir,
        rname,
      })

      console.log('')
      console.log(`${chalk.green('[exec]')} for ${chalk.yellow(item)}`)
      console.log(`  ${chalk.green('command')}: ${chalk.yellow(usingCommand)}`)

      if (this.showTags) {
        console.log(`  tags ${chalk.green(':fullpath')}: ${chalk.cyan(fullpath)}`)
        console.log(`  tags ${chalk.green(':dir')}:      ${chalk.cyan(dir)}`)
        console.log(`  tags ${chalk.green(':file')}:     ${chalk.cyan(file)}`)
        console.log(`  tags ${chalk.green(':name')}:     ${chalk.cyan(name)}`)
        console.log(`  tags ${chalk.green(':ext')}:      ${chalk.cyan(ext)}`)
        console.log(`  tags ${chalk.green(':pdir')}:     ${chalk.cyan(pdir)}`)
        console.log(`  tags ${chalk.green(':rname')}:    ${chalk.cyan(rname)}`)
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

interface Options {
  fullpath: string
  dir: string
  file: string
  name: string
  ext: string
  pdir: string
  rname: string
}
function getUsingCommand(template: string, options: Options) {
  const tokens = [
    // this should be process first
    ':pdir',
    ':rname',
    //
    ':fullpath',
    ':dir',
    ':file',
    ':name',
    ':ext',
  ]

  let result = template
  for (let t of tokens) {
    const val = options[t.slice(1)]
    if (!val) continue
    result = result.replace(new RegExp(t, 'g'), val)
  }

  return result
}
