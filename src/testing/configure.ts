export type ZenTraceConfig = {
  /** Default-on `captureArgs` / `captureResult` for `@trace()` and `traceFn()`. */
  capture?: boolean
  captureArgs?: boolean
  captureResult?: boolean
  /** Spans slower than this (ms) are highlighted in the UI. */
  slowThresholdMs?: number
}

const defaults: Required<ZenTraceConfig> = {
  capture: false,
  captureArgs: false,
  captureResult: false,
  slowThresholdMs: 100,
}

let config: Required<ZenTraceConfig> = { ...defaults }

export function configureZenTrace(options: ZenTraceConfig = {}): void {
  const next = { ...config, ...options }

  if (options.capture) {
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
