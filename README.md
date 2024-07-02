# x-args

> play with cli commands like a composer

[![Build Status](https://img.shields.io/travis/magicdawn/x-args.svg?style=flat-square)](https://travis-ci.org/magicdawn/x-args)
[![Coverage Status](https://img.shields.io/codecov/c/github/magicdawn/x-args.svg?style=flat-square)](https://codecov.io/gh/magicdawn/x-args)
[![npm version](https://img.shields.io/npm/v/@magicdawn/x-args.svg?style=flat-square)](https://www.npmjs.com/package/@magicdawn/x-args)
[![npm downloads](https://img.shields.io/npm/dm/@magicdawn/x-args.svg?style=flat-square)](https://www.npmjs.com/package/@magicdawn/x-args)
[![npm license](https://img.shields.io/npm/l/@magicdawn/x-args.svg?style=flat-square)](http://magicdawn.mit-license.org)

## Install

```sh
$ pnpm add @magicdawn/x-args -g

# or
$ pnpm dlx @magicdawn/x-args
$ pnpx @magicdawn/x-args
$ bunx @magicdawn/x-args
```

## Commands

### `x-args` command

```sh
x-args -f './*.*' -c $'cwebp :file -o \':dir/:name_compressed.:ext\''
```

use `-t` to show available tokens

### `txt` sub command

```sh
# use :line
x-args txt ./to-be-processed.txt -c 'echo :line'
```

features that native xargs does not have

- comment, `x-args txt` support `//` or `#` comment, I suggest use `.conf` extenstion, so that editors can recognize `#` comment
- live reload, `x-args txt` read txt file, exec command, and read txt again, so edit after command start will works as well
- wait input update: use `-w,--wait`, so that this command will not exit but to wait txt file update. use `--wait-timeout 1h` to delay `1h` 1 hour.

#### Templates

- use `:line` for whole line
- use `:args0` / `:arg0` for single arg
- use `-s` / `--split` / `--args-split` to specify how to turn `:line` to `:args0`, default using `/\s+/`

when input is a filepath, and may contains space, use a different separator that has low possibility occurs in a filepath
for example

- ancient chinese character for Simplified chinese user: `__纛恚掾旒__`, `--args-split '__纛恚掾旒__'`, [出处](https://mp.weixin.qq.com/s?__biz=MjM5ODI2MTQxOQ==&mid=2653658340&idx=1&sn=32eb7031cdb585eb216ba1490f0629cd&chksm=bd125b208a65d2368daa60d158e9fc12b2997b2324a1d3938727aef3f5f4cecdd7529ea8c6b0&scene=27)
- english user, maybe a emoji combination ?

## Tips

### `-c,--command`

if need single quote in `-c,--command`, u can use `-c $'command \'inside-a-quote\''`, a special shell syntax learn from zx, see

- https://github.com/google/zx/blob/main/docs/quotes.md#quotes
- https://stackoverflow.com/a/16605140

#### `:line` / `:arg0`

this will be auto escaped, no need to manual quote, just use plain `:line` / `:arg0`

### retry

if your `-c,--command` may fail, and u need retry it. u can use https://npm.im/retry-cli

```sh
# install globally
pnpm add -g retry-cli

# add retry to `command-may-fail`
x-args txt ./to-be-processed.txt -c 'retry -- command-may-fail :line'

# retry times 1000, default: 10, see retry-cli homepage
x-args txt ./to-be-processed.txt -c 'retry -n 1000 -- command-may-fail :line'
```

## Changelog

[CHANGELOG.md](CHANGELOG.md)

## License

the MIT License http://magicdawn.mit-license.org
