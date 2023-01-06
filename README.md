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
$ pnpm --package=@magicdawn/x-args dlx x-args
```

## Commands

### `default` command

```sh
x-args
```

### `txt` command

```sh
# use :line
x-args txt ./to-be-processed.txt -c $'echo \':line\''
```

features that native xargs does not have

- comment, `x-args txt` support `//` or `#` comment
- live reload, `x-args txt` read txt file, exec command, and read txt again, so edit after command start will works as well

#### Templates

- use `:line` for whole line
- use `args0` / `arg0` for single arg
- use `--argsSplit` to specify how to turn `:line` to `:args0`, default using a space

## Tips

### `-c,--command`

```bash
# x-args glob file command
x-args -f './some.pattern' -c $'echo :line'

# if :line has space, must be quoted
x-args -f './some.pattern' -c $'echo \':line\''
```

a special shell syntax learn from zx, see

- https://github.com/google/zx/blob/main/docs/quotes.md#quotes
- https://stackoverflow.com/a/16605140

## Changelog

[CHANGELOG.md](CHANGELOG.md)

## License

the MIT License http://magicdawn.mit-license.org
