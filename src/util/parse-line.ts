export function parseLineToArgs(line: string): string[] {
  const result: string[] = []
  const regex = /'([^']*)'|"([^"]*)"|\S+/g
  let match: RegExpExecArray | null

  while ((match = regex.exec(line)) !== null) {
    if (match[1] !== undefined) {
      result.push(match[1])
    } else if (match[2] === undefined) {
      result.push(match[0])
    } else {
      result.push(match[2])
    }
  }

  return result
}
