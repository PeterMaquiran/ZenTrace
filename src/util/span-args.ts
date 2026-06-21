import { Span } from '../core/span'
import type { Span as SpanType } from '../core/span'

export function isSpan(value: unknown): value is SpanType {
  return value instanceof Span
}

export function receivesSpanParam(fn: Function): boolean {
  const src = fn.toString()
  return /,\s*span\s*(\??\s*[:)]|\))/i.test(src)
}

export type ResolvedCallArgs<TArgs extends unknown[]> = {
  callArgs: TArgs
  parentSpan?: SpanType
}

/** Pull an explicit parent span from the last argument (manual propagation). */
export function resolveManualPropagation<TArgs extends unknown[]>(
  args: TArgs,
): ResolvedCallArgs<TArgs> {
  if (args.length === 0) {
    return { callArgs: args }
  }

  const last = args[args.length - 1]
  if (isSpan(last)) {
    return {
      callArgs: args.slice(0, -1) as TArgs,
      parentSpan: last,
    }
  }

  return { callArgs: args }
}
