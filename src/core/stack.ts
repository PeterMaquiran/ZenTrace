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

export function formatLogArgs(args: unknown[]): string {
  return args
    .map((arg) => {
      try {
        return typeof arg === 'string' ? arg : JSON.stringify(arg)
      } catch {
        return String(arg)
      }
    })
    .join(' ')
}
