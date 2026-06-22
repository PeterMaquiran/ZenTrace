export type ZenTraceConfig = {
  /** Enables captureArgs/captureResult defaults for @trace(). */
  testMode?: boolean
  captureArgs?: boolean
  captureResult?: boolean
  /** Spans slower than this (ms) are highlighted in the UI. */
  slowThresholdMs?: number
}

const defaults: Required<ZenTraceConfig> = {
  testMode: false,
  captureArgs: false,
  captureResult: false,
  slowThresholdMs: 100,
}

let config: Required<ZenTraceConfig> = { ...defaults }

export function configureZenTrace(options: ZenTraceConfig = {}): void {
  const next = { ...config, ...options }

  if (options.testMode) {
    next.captureArgs = options.captureArgs ?? true
    next.captureResult = options.captureResult ?? true
  }

  config = next
}

export function getZenTraceConfig(): Readonly<Required<ZenTraceConfig>> {
  return config
}

export function resetZenTraceConfig(): void {
  config = { ...defaults }
}
