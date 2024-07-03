import { type Config } from 'release-it'
const defineConfig = (c: Config) => c

export default defineConfig({
  git: {
    commitMessage: 'chore: release v${version}',
    tag: true,
    push: false, // I want manual push
  },
  github: {
    release: false,
  },
  npm: {
    publish: true,
  },
  hooks: {
    'after:release': ['mc sync'],
  },
})
