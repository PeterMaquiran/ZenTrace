export type DevTraceConfig = {
  /** Enables captureArgs/captureResult defaults for @trace(). */
  testMode?: boolean
  captureArgs?: boolean
  captureResult?: boolean
  /** Spans slower than this (ms) are highlighted in the UI. */
  slowThresholdMs?: number
}

const defaults: Required<DevTraceConfig> = {
  testMode: false,
  captureArgs: false,
  captureResult: false,
  slowThresholdMs: 100,
}

let config: Required<DevTraceConfig> = { ...defaults }

export function configureDevTrace(options: DevTraceConfig = {}): void {
  const next = { ...config, ...options }

  if (options.testMode) {
    next.captureArgs = options.captureArgs ?? true
    next.captureResult = options.captureResult ?? true
  }

  config = next
}

export function getDevTraceConfig(): Readonly<Required<DevTraceConfig>> {
  return config
}

export function resetDevTraceConfig(): void {
  config = { ...defaults }
}
