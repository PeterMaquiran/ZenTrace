import { emitTrace } from '../exporters/browser/browser-export'
import { SpanStorage } from '../storage/memory-storage'

import {
  enterSpan,
  leaveSpan,
  markSpan,
  resolveParentSpan,
} from './active-context'
import type { Span } from './span'
import { captureStack } from './stack'
import { Tracer } from './tracer'


export type RunSpanOptions = {
  module?: string
  captureArgs?: unknown[]
  captureResult?: boolean
  returnSpan?: boolean
  serviceName?: string
  marker?: string
}

const defaultTracer = new Tracer('devtrace')

export async function runSpan<T>(
  name: string,
  fn: (span: Span) => T | Promise<T>,
  options: RunSpanOptions = {},
): Promise<T | Span> {
  const entryStack = captureStack()
  const parent = resolveParentSpan(entryStack)
  const tracer = options.serviceName
    ? new Tracer(options.serviceName)
    : defaultTracer

  const span =
    parent?.child(name, options.module) ||
    tracer.startSpan(name, undefined, options.module)

  if (options.marker) markSpan(span, options.marker)
  enterSpan(span)

  if (options.captureArgs?.length) {
    span.addAttribute('input', safeSerialize(options.captureArgs))
  }

  SpanStorage.add(span)

  const start = performance.now()

  try {
    const result = await fn(span)
    const duration = performance.now() - start

    span.addAttribute('duration_ms', String(duration))

    if (options.captureResult) {
      span.addAttribute('output', safeSerialize(result))
    }

    await span.end()
    emitSpan(span, duration)

    if (options.returnSpan) return span
    return result
  } catch (err: unknown) {
    span.recordError(err)
    const duration = performance.now() - start
    await span.end()
    emitSpan(span, duration)
    throw err
  } finally {
    leaveSpan(span)
  }
}

function emitSpan(span: Span, durationMs: number) {
  if (typeof window !== 'undefined') {
    emitTrace(span.toJSON(durationMs * 1000))
  }
}

function safeSerialize(value: unknown) {
  try {
    return JSON.stringify(value, getCircularReplacer())
  } catch {
    return '[unserializable]'
  }
}

function getCircularReplacer() {
  const seen = new WeakSet<object>()

  return (_key: string, value: unknown) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) return '[Circular]'
      seen.add(value)
    }
    return value
  }
}
