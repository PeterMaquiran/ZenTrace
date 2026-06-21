import type { Span } from './span'

const RUNTIME_KEY = '__DEVTRACE_RUNTIME__'

export type TraceRuntime = {
  spanStack: Span[]
  spanMarkers: WeakMap<Span, string>
}

export function getTraceRuntime(): TraceRuntime {
  const globalRef = globalThis as typeof globalThis & {
    [RUNTIME_KEY]?: TraceRuntime
  }

  if (!globalRef[RUNTIME_KEY]) {
    globalRef[RUNTIME_KEY] = {
      spanStack: [],
      spanMarkers: new WeakMap<Span, string>(),
    }
  }

  return globalRef[RUNTIME_KEY]
}

export function pushSpan(span: Span, marker?: string) {
  const runtime = getTraceRuntime()
  runtime.spanStack.push(span)
  if (marker) runtime.spanMarkers.set(span, marker)
}

export function popSpan(span: Span) {
  const runtime = getTraceRuntime()
  const index = runtime.spanStack.lastIndexOf(span)
  if (index >= 0) runtime.spanStack.splice(index, 1)
}

export function markSpan(span: Span, marker: string) {
  getTraceRuntime().spanMarkers.set(span, marker)
}

export function getCurrentSpan(): Span | undefined {
  const stack = getTraceRuntime().spanStack
  return stack[stack.length - 1]
}

export function getActiveSpans(): Span[] {
  return [...getTraceRuntime().spanStack]
}

export function getSpanMarker(span: Span): string | undefined {
  return getTraceRuntime().spanMarkers.get(span)
}

const PARENT_HEADER = 'x-devtrace-parent-span-id'

export function extractParentSpanFromHeaders(
  headers: Headers | Record<string, string>,
): Span | undefined {
  let spanId: string | null | undefined

  if (headers instanceof Headers) {
    spanId = headers.get(PARENT_HEADER)
  } else {
    // handle case-insensitive headers
    spanId =
      headers[PARENT_HEADER] ??
      headers[PARENT_HEADER.toLowerCase()] ??
      headers[PARENT_HEADER.toUpperCase()]
  }

  if (!spanId) return

  const runtime = getTraceRuntime()
  const span = runtime.spanStack.find((span) => span.context.spanId === spanId)

  // ✅ cleanup header (important)
  if (headers instanceof Headers) {
    headers.delete(PARENT_HEADER)
  } else {
    delete headers[PARENT_HEADER]
    delete headers[PARENT_HEADER.toLowerCase()]
    delete headers[PARENT_HEADER.toUpperCase()]
  }

  return span
}
