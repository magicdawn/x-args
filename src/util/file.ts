import chalk from 'chalk'
import path from 'path'

export interface FilenameTokens {
  fullpath: string
  dir: string
  file: string
  name: string
  ext: string
  pdir: string
  rname: string
}

export function getFilenameTokens(item: string): FilenameTokens {
  // /foo/bar/baz.xyz
  const fullpath = path.resolve(item)
  const dir = path.dirname(fullpath) // /foo/bar/
  const file = path.basename(fullpath) // baz.xyz
  let ext = path.extname(fullpath) // .xyz
  const name = path.basename(fullpath, ext) // baz
  ext = ext.slice(1) // remove . => xyz
  const pdir = path.basename(dir) // bar
  const rname = item // relative filename

  return {
    fullpath,
    dir,
    file,
    name,
    ext,
    pdir,
    rname,
  }
}

export function renderFilenameTokens(template: string, options: FilenameTokens) {
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
  for (const t of tokens) {
    const val = options[t.slice(1) as keyof FilenameTokens]
    if (!val) continue
    result = result.replace(new RegExp(t, 'g'), val)
  }

  return result
}

export function printFilenameTokens(tokens: FilenameTokens) {
  const { fullpath, dir, file, name, ext, pdir, rname } = tokens
  console.log(`  token ${chalk.green(':fullpath')} ${chalk.cyan(fullpath)}`)
  console.log(`  token ${chalk.green(':dir')}      ${chalk.cyan(dir)}`)
  console.log(`  token ${chalk.green(':file')}     ${chalk.cyan(file)}`)
  console.log(`  token ${chalk.green(':name')}     ${chalk.cyan(name)}`)
  console.log(`  token ${chalk.green(':ext')}      ${chalk.cyan(ext)}`)
  console.log(`  token ${chalk.green(':pdir')}     ${chalk.cyan(pdir)}`)
  console.log(`  token ${chalk.green(':rname')}    ${chalk.cyan(rname)}`)
}
