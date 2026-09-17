import type { Span } from '../core/span.js'
import { captureStack, getFunctionMarker } from '../core/stack.js'

import {
  getActiveSpans,
  getCurrentSpan,
  getSpanMarker,
  markSpan,
  popSpan,
  pushSpan,
} from './trace-runtime.js'

export function enterSpan(span: Span) {
  pushSpan(span)
}

export function leaveSpan(span: Span) {
  popSpan(span)
}

export { getCurrentSpan, markSpan }

export function resolveSpanFromStack(stack = captureStack()): Span | undefined {
  const current = getCurrentSpan()
  if (current) return current

  const currentMarker = getFunctionMarker(stack)
  let best: Span | undefined
  let bestPosition = Infinity

  for (const span of getActiveSpans()) {
    const marker = getSpanMarker(span)
    if (!marker) continue

    const position = stack.indexOf(marker)
    if (position < 0) continue

    if (marker === currentMarker) return span

    if (position < bestPosition) {
      best = span
      bestPosition = position
    }
  }

  return best
}
