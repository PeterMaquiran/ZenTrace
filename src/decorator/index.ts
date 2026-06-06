import type { Span } from '../core/span'

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
      const __trace = args[args.length - 1]

      const parentSpan: Span | undefined = __trace?.span

      const span: Span =
        parentSpan?.child(propertyKey, options.module) ||
        (this as any).__tracer?.startSpan(
          propertyKey,
          undefined,
          options.module,
        )

      // inject trace into last arg (propagation)
      args[args.length - 1] = {
        ...(__trace || {}),
        span,
        context: span.context,
      }

      // INPUT CAPTURE
      if (options.captureArgs) {
        span.addAttribute('input', safeSerialize(args.slice(0, -1)))
      }

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
