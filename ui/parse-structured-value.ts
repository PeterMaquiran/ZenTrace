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

export type MessageStructuredSplit = {
  prefix: string
  rawStructured: string
  data: unknown
}

/** Split "checkout completed {...}" into prefix text and a parseable suffix. */
export function splitMessageWithStructuredSuffix(
  value: string,
): MessageStructuredSplit | undefined {
  const openIdx = value.search(/[[{]/)
  if (openIdx <= 0) return undefined

  const prefix = value.slice(0, openIdx).trimEnd()
  const rawStructured = value.slice(openIdx).trim()
  if (!prefix) return undefined

  const data = parseStructuredValue(rawStructured)
  if (data === undefined) return undefined

  return { prefix, rawStructured, data }
}

export function structuredValuePreview(data: unknown): string {
  if (data === null) return 'null'
  if (Array.isArray(data)) {
    return `[…${data.length} item${data.length === 1 ? '' : 's'}]`
  }
  if (typeof data === 'object') {
    const keys = Object.keys(data as Record<string, unknown>)
    return `{…${keys.length} key${keys.length === 1 ? '' : 's'}}`
  }
  return String(data)
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
