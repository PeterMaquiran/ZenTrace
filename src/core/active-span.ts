import type { Span } from './span'
import { getCurrentSpan, markSpan } from './trace-runtime'

export function getActiveSpan(): Span | undefined {
  return getCurrentSpan()
}

export const activeSpan = {
  get name() {
    return getCurrentSpan()?.name ?? ''
  },

  set name(value: string) {
    const span = getCurrentSpan()
    if (!span) return

    span.name = value
    markSpan(span, value)
  },
}
