import { runSpan, type RunSpanOptions } from '../core/run-span'
import type { Span } from '../core/span'
import { getDevTraceConfig } from '../testing/configure'

import type { TraceOptions } from './decorator'

type TraceFnOptions = TraceOptions & {
  name?: string
  marker?: string
}

type TraceFnReturn<
  TResult,
  TSpan extends boolean | undefined,
> = TSpan extends true ? Span : TResult

export function traceFn<
  TArgs extends unknown[],
  TResult,
  TSpan extends boolean | undefined = false,
>(
  fn: (...args: TArgs) => Promise<TResult>,
  options: TraceFnOptions & { span?: TSpan } = {},
): (...args: TArgs) => Promise<TraceFnReturn<TResult, TSpan>> {
  const defaults = getDevTraceConfig()

  const shouldCaptureArgs = options.captureArgs ?? defaults.captureArgs
  const shouldCaptureResult = options.captureResult ?? defaults.captureResult

  const name = options.name ?? fn.name ?? 'anonymous'
  const marker = options.marker ?? name

  return (async (...args: TArgs) => {
    return runSpan(name, async () => fn(...args), {
      module: options.module,
      captureArgs: shouldCaptureArgs ? args : undefined,
      captureResult: shouldCaptureResult,
      returnSpan: options.span,
      marker,
    } satisfies RunSpanOptions)
  }) as (...args: TArgs) => Promise<TraceFnReturn<TResult, TSpan>>
}
