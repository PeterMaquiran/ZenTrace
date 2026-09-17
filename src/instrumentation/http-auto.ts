let ensure: (() => void) | undefined

/** Called from `http.ts` so `run-span` can patch fetch without a circular import. */
export function registerHttpTracingEnsure(fn: () => void) {
  ensure = fn
}

export function ensureHttpTracing() {
  ensure?.()
}
