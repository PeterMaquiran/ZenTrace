/** Parse strict JSON or relaxed JS object/array literals. */
export function parseStructuredValue(value: string): unknown | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined

  try {
    return JSON.parse(trimmed) as unknown
  } catch {
    // continue with relaxed parsing
  }

  if (!/^[[{]/.test(trimmed)) return undefined

  try {
    const result = new Function(`"use strict"; return (${trimmed});`)()
    if (result !== undefined) return result as unknown
  } catch {
    return undefined
  }

  return undefined
}

type Token = { type: string; text: string }

export function tokenizeLooseJson(text: string): Token[] {
  const pattern =
    /(\{|\}|\[|\]|:|,)|('(?:\\'|[^'])*'|"(?:\\"|[^"])*")|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(\btrue\b|\bfalse\b|\bnull\b)|([A-Za-z_$][\w$]*)/g

  const tokens: Token[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'plain', text: text.slice(lastIndex, match.index) })
    }

    const [raw, punct, str, num, bool, ident] = match

    if (punct) tokens.push({ type: 'punct', text: punct })
    else if (str) tokens.push({ type: 'string', text: str })
    else if (num) tokens.push({ type: 'number', text: num })
    else if (bool) tokens.push({ type: 'boolean', text: bool })
    else if (ident) {
      const next = text.slice(match.index + raw.length)
      tokens.push({
        type: /^\s*:/.test(next) ? 'key' : 'ident',
        text: ident,
      })
    }

    lastIndex = match.index + raw.length
  }

  if (lastIndex < text.length) {
    tokens.push({ type: 'plain', text: text.slice(lastIndex) })
  }

  return tokens
}
