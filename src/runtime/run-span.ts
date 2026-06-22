import type { Span } from '../core/span'
import { Tracer } from '../core/tracer'
import { emitTrace } from '../exporters/browser/browser-export'
import { SpanStorage } from '../storage/memory-storage'
import { getTraceSession, SESSION_TAGS } from '../testing/session'

import { enterSpan, leaveSpan, markSpan } from './active-context'

export type RunSpanOptions = {
  module?: string
  captureArgs?: unknown[]
  captureResult?: boolean
  returnSpan?: boolean
  serviceName?: string
  marker?: string
  /** Explicit parent — omit to start a new root trace (no automatic stack linking). */
  parentSpan?: Span
}

const defaultTracer = new Tracer('devtrace')

type SpanRun = {
  span: Span
  start: number
  options: RunSpanOptions
}

function beginSpanRun(name: string, options: RunSpanOptions): SpanRun {
  const parent = options.parentSpan
  const tracer = options.serviceName
    ? new Tracer(options.serviceName)
    : defaultTracer

  const span =
    parent?.child(name, options.module) ||
    tracer.startSpan(name, undefined, options.module)

  if (!parent) applySessionTags(span)

  if (options.marker) markSpan(span, options.marker)
  enterSpan(span)

  if (options.captureArgs?.length) {
    span.addAttribute('input', safeSerialize(options.captureArgs))
  }

  SpanStorage.add(span)

  return { span, start: performance.now(), options }
}

function finishSpanRun(run: SpanRun, result: unknown) {
  const duration = performance.now() - run.start

  run.span.addAttribute('duration_ms', String(duration))

  if (run.options.captureResult) {
    run.span.addAttribute('output', safeSerialize(result))
  }

  void run.span.end()
  emitSpan(run.span, duration)
  leaveSpan(run.span)
}

function failSpanRun(run: SpanRun, err: unknown) {
  run.span.recordError(err)
  const duration = performance.now() - run.start
  void run.span.end()
  emitSpan(run.span, duration)
  leaveSpan(run.span)
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    value !== null &&
    typeof value === 'object' &&
    'then' in value &&
    typeof value.then === 'function'
  )
}

function wrapTeardown<T extends (...args: unknown[]) => unknown>(
  teardown: T,
  run: SpanRun,
): T {
  return ((...args: unknown[]) => {
    try {
      const result = teardown(...args)

      if (isThenable(result)) {
        return Promise.resolve(result).finally(() => finishSpanRun(run, result))
      }

      finishSpanRun(run, result)
      return result
    } catch (err: unknown) {
      failSpanRun(run, err)
      throw err
    }
  }) as T
}

function completeSpanRun(run: SpanRun, result: unknown): unknown {
  if (typeof result === 'function') {
    if (run.options.returnSpan) {
      finishSpanRun(run, result)
      return run.span
    }

    return wrapTeardown(result as (...args: unknown[]) => unknown, run)
  }

  finishSpanRun(run, result)

  if (run.options.returnSpan) return run.span
  return result
}

export function runSpanSync<T>(
  name: string,
  fn: (span: Span) => T,
  options: RunSpanOptions = {},
): T | Span {
  const run = beginSpanRun(name, options)

  try {
    const result = fn(run.span)
    return completeSpanRun(run, result) as T | Span
  } catch (err: unknown) {
    failSpanRun(run, err)
    throw err
  }
}

export async function runSpan<T>(
  name: string,
  fn: (span: Span) => T | Promise<T>,
  options: RunSpanOptions = {},
): Promise<T | Span> {
  const run = beginSpanRun(name, options)

  try {
    const result = await fn(run.span)
    return completeSpanRun(run, result) as T | Span
  } catch (err: unknown) {
    failSpanRun(run, err)
    throw err
  }
}

function emitSpan(span: Span, durationMs: number) {
  if (typeof window !== 'undefined') {
    emitTrace(span.toJSON(durationMs * 1000))
  }
}

function applySessionTags(span: Span) {
  const session = getTraceSession()
  if (!session) return

  span.addAttribute(SESSION_TAGS.sessionId, session.id)
  span.addAttribute(SESSION_TAGS.testTitle, session.title)
  span.addAttribute(SESSION_TAGS.testFile, session.file)
  if (session.project) {
    span.addAttribute(SESSION_TAGS.testProject, session.project)
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
