import { createHash } from 'node:crypto'
import path from 'node:path'
import envPaths from 'env-paths'
import { fse } from '../libs'

export const appTempDir = envPaths('x-args').temp
fse.ensureDirSync(appTempDir)

const hash = (s: string) => createHash('sha1').update(s).digest('hex')

export function lockfileOf(file: string) {
  return path.join(appTempDir, hash(file))
}

export function lockOptionsOf(file: string) {
  return { lockfilePath: lockfileOf(file) }
}
