const INTERNAL_MARKERS = [
  'runSpan',
  'run-span',
  'decorator',
  'active-context',
  'trace-runtime',
  'stack.ts',
  'instrumentation/logs',
  'instrumentation/log-record',
  'instrumentation/http',
  'browser-export',
  'exporters/browser',
  '/logs.ts',
]

export function captureStack(): string {
  return new Error().stack ?? ''
}

/** First user frame in a stack (skips Error + internals). */
export function getFunctionMarker(stack: string): string {
  const lines = stack.split('\n')

  for (const line of lines.slice(1)) {
    if (INTERNAL_MARKERS.some((marker) => line.includes(marker))) continue

    const match = line.match(/at\s+(?:async\s+)?(.+)/)
    if (match) return match[1].trim()
  }

  return ''
}

export type ParsedLogArgs = {
  message: string
  fields: Record<string, unknown>
}

/** Split console-style args into a clean message and structured fields (Pino-like). */
export function parseLogArgs(args: unknown[]): ParsedLogArgs {
  const parts: string[] = []
  const fields: Record<string, unknown> = {}

  for (const arg of args) {
    if (arg instanceof Error) {
      fields.err = {
        type: arg.name,
        message: arg.message,
        stack: arg.stack,
      }
      continue
    }

    if (isPlainObject(arg)) {
      Object.assign(fields, arg)
      continue
    }

    parts.push(stringifyArg(arg))
  }

  return {
    message: parts.join(' '),
    fields,
  }
}

/** Flatten args to a single string (annotations / legacy display). */
export function formatLogArgs(args: unknown[]): string {
  return parseLogArgs(args).message
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false
  if (Array.isArray(value)) return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

function stringifyArg(arg: unknown): string {
  if (typeof arg === 'string') return arg
  try {
    return JSON.stringify(arg)
  } catch {
    return String(arg)
  }
}
