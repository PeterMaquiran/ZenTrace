import { runSpan, type RunSpanOptions } from '../core/run-span'
import type { Span } from '../core/span'

type TraceOptions = {
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
      return runSpan(propertyKey, async () => original.apply(this, args), {
        module: options.module,
        captureArgs: options.captureArgs ? args : undefined,
        captureResult: options.captureResult,
        returnSpan: options.span,
        marker,
      } satisfies RunSpanOptions)
    }

    return descriptor
  }
}

export type { Span }
