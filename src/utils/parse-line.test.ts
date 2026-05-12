import { parseLineToArgs } from './parse-line'

const tests: { input: string; expected: string[] }[] = [
  {
    input: `foo bar baz`,
    expected: ['foo', 'bar', 'baz'],
  },
  {
    input: `'foo bar' baz`,
    expected: ['foo bar', 'baz'],
  },
  {
    input: `"foo bar" 'baz qux'`,
    expected: ['foo bar', 'baz qux'],
  },
  {
    input: `  foo   "bar baz"  'qux quux' `,
    expected: ['foo', 'bar baz', 'qux quux'],
  },
  {
    input: `arg1 'arg 2' "arg 3" arg4`,
    expected: ['arg1', 'arg 2', 'arg 3', 'arg4'],
  },
  {
    input: `"hello 'world'" 'foo "bar"'`,
    expected: [`hello 'world'`, `foo "bar"`],
  },
  {
    input: `'' "" '  ' "  "`,
    expected: ['', '', '  ', '  '],
  },
  {
    input: `url 'some filepath with space'`,
    expected: ['url', 'some filepath with space'],
  },
]

tests.forEach(({ input, expected }, i) => {
  const actual = parseLineToArgs(input)
  const pass = JSON.stringify(actual) === JSON.stringify(expected)
  console.log(`Test #${i + 1}: ${pass ? '✅ PASS' : '❌ FAIL'}`)
  if (!pass) {
    console.log(`  Input   : ${input}`)
    console.log(`  Expected: ${JSON.stringify(expected)}`)
    console.log(`  Got     : ${JSON.stringify(actual)}`)
  }
})
