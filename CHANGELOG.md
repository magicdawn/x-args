# CHANGELOG

## v1.4.2 2024-07-02

### 🐛 Fixes

- Enum SessionControl should not use type export - by **magicdawn** [<samp>(6ac0f)</samp>](https://github.com/magicdawn/x-args/commit/6ac0fa2)

## v1.4.1 2024-07-02

### 🏡 Chores

- Export SessionControl enum too - by **magicdawn** [<samp>(92872)</samp>](https://github.com/magicdawn/x-args/commit/92872e8)

## v1.4.0 2024-06-30

### 🚀 Features

- Validate using zod - by **magicdawn** [<samp>(2bac9)</samp>](https://github.com/magicdawn/x-args/commit/2bac9ae)

### 🐛 Fixes

- Make typecheck pass, strict tsconfig pass - by **magicdawn** [<samp>(c04e8)</samp>](https://github.com/magicdawn/x-args/commit/c04e895)

## v1.3.0 2024-06-30

### 🚀 Features

- Utilize boxen - by **magicdawn** [<samp>(07c13)</samp>](https://github.com/magicdawn/x-args/commit/07c131a)
- Add session file - by **magicdawn** [<samp>(5de19)</samp>](https://github.com/magicdawn/x-args/commit/5de1943)

### 🏡 Chores

- Use Pick to get TxtCommandArgs - by **magicdawn** [<samp>(2c7d4)</samp>](https://github.com/magicdawn/x-args/commit/2c7d423)

## v1.2.0 2024-02-29

- cf6817f feat: export startTxtCommand
- c76f59b chore: clean up legacy bin dir

## v1.1.0 2024-02-18

- 0d3c36c chore: more
- 6bae852 feat: add --WT alias to --wait-timeout
- 49971d7 chore: clean up test code & update deps
- 4e3d626 feat: color output
- f65404e feat: add -w/--wait & --wait-timeout to txt command
- 03ed10b chore: update readme

## v1.0.0 2023-10-14

- ESM only, so a major version bump

## v0.2.0 2023-01-07

- 16b2768 feat: txt, `:args0` / `:arg0` both works
- 4e4ef44 feat: add support for `:line` / `:arg0` / `:arg<n>`

## v0.1.0 2022-08-31

- add `txt` command, `x-args txt ./some.txt -c $'echo \':line\''`

## v0.0.3 2022-06-05

- export `FilenameTokens` / `getFilenameTokens` / `renderFilenameTokens` / `printFilenameTokens` etc

## v0.0.2 2022-06-05

- support `pnpm dlx @magicdawn/x-args`

## v0.0.1 2022-06-05

- first release
