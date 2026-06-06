import type { Span } from '../core/span'
import { SpanStorage } from '../storage/memory-storage'

import { Tracer } from '@/core/tracer'

type TraceOptions = {
  module?: string
  captureArgs?: boolean
  captureResult?: boolean
}

export function trace(options: TraceOptions = {}) {
  return function (
    _target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const original = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const lartArg = args[args.length - 1]

      const parentSpan: Span | undefined = lartArg?.span

      const span: Span =
        parentSpan?.child(propertyKey, options.module) ||
        new Tracer('').startSpan(propertyKey, undefined, options.module)

      // INPUT CAPTURE
      if (options.captureArgs) {
        if (parentSpan) {
          span.addAttribute('input', safeSerialize(args.slice(0, -1)))
        } else {
          span.addAttribute('input', safeSerialize(args))
        }
      }

      args.push({ span })
      SpanStorage.add(span)

      const start = performance.now()

      try {
        const result = await original.apply(this, args)

        const duration = performance.now() - start

        span.addAttribute('duration_ms', String(duration))

        // OUTPUT CAPTURE
        if (options.captureResult) {
          span.addAttribute('output', safeSerialize(result))
        }

        await span.end()

        // only used in testing
        if ((options as any).span) {
          return span
        }

        return result
      } catch (err: any) {
        span.recordError(err)
        await span.end()
        throw err
      }
    }

    return descriptor
  }
}

function safeSerialize(value: any) {
  try {
    return JSON.stringify(value, getCircularReplacer())
  } catch {
    return '[unserializable]'
  }
}

function getCircularReplacer() {
  const seen = new WeakSet()

  return (_key: string, value: any) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) return '[Circular]'
      seen.add(value)
    }
    return value
  }
}
