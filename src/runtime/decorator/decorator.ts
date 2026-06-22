import type { Span } from '../../core/span'
import { getDevTraceConfig } from '../../testing/configure'
import { resolveManualPropagation } from '../../util/span-args'
import { runSpan, type RunSpanOptions } from '../run-span'

export type TraceOptions = {
  module?: string
  captureArgs?: boolean
  captureResult?: boolean
  /** @internal test helper — returns the span instead of the method result */
  span?: boolean
}

export function trace(options: TraceOptions = {}) {
  return function (
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const original = descriptor.value as (
      ...args: unknown[]
    ) => Promise<unknown>
    const className =
      (target as { constructor?: { name?: string } }).constructor?.name ??
      'Anonymous'
    const marker = `${className}.${propertyKey}`

    descriptor.value = async function (...args: unknown[]) {
      const defaults = getDevTraceConfig()
      const shouldCaptureArgs = options.captureArgs ?? defaults.captureArgs
      const shouldCaptureResult =
        options.captureResult ?? defaults.captureResult

      const { callArgs, parentSpan } = resolveManualPropagation(args)

      return runSpan(
        propertyKey,
        (span) => original.apply(this, [...callArgs, span]),
        {
          module: options.module,
          captureArgs: shouldCaptureArgs ? callArgs : undefined,
          captureResult: shouldCaptureResult,
          returnSpan: options.span,
          marker,
          parentSpan,
        } satisfies RunSpanOptions,
      )
    }

    return descriptor
  }
}

export type { Span }
