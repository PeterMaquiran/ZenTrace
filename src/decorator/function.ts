import { runSpan, runSpanSync, type RunSpanOptions } from '../core/run-span'
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

function buildRunSpanOptions(
  args: unknown[],
  options: TraceFnOptions,
  name: string,
  marker: string,
): RunSpanOptions {
  const defaults = getDevTraceConfig()
  const shouldCaptureArgs = options.captureArgs ?? defaults.captureArgs
  const shouldCaptureResult = options.captureResult ?? defaults.captureResult

  return {
    module: options.module,
    captureArgs: shouldCaptureArgs ? args : undefined,
    captureResult: shouldCaptureResult,
    returnSpan: options.span,
    marker,
  } satisfies RunSpanOptions
}

export function traceFn<
  TArgs extends unknown[],
  TResult,
  TSpan extends boolean | undefined = false,
>(
  fn: (...args: TArgs) => TResult,
  options?: TraceFnOptions & { span?: TSpan },
): (...args: TArgs) => TraceFnReturn<TResult, TSpan>

export function traceFn<
  TArgs extends unknown[],
  TResult,
  TSpan extends boolean | undefined = false,
>(
  fn: (...args: TArgs) => Promise<TResult>,
  options?: TraceFnOptions & { span?: TSpan },
): (...args: TArgs) => Promise<TraceFnReturn<TResult, TSpan>>

export function traceFn<
  TArgs extends unknown[],
  TResult,
  TSpan extends boolean | undefined = false,
>(
  fn: ((...args: TArgs) => TResult) | ((...args: TArgs) => Promise<TResult>),
  options: TraceFnOptions & { span?: TSpan } = {},
): (
  ...args: TArgs
) => TraceFnReturn<TResult, TSpan> | Promise<TraceFnReturn<TResult, TSpan>> {
  const name = options.name ?? (fn.name || 'anonymous')
  const marker = options.marker ?? name

  if (fn.constructor.name === 'AsyncFunction') {
    return (async (...args: TArgs) => {
      return runSpan(
        name,
        () => (fn as (...args: TArgs) => Promise<TResult>)(...args),
        buildRunSpanOptions(args, options, name, marker),
      ) as Promise<TraceFnReturn<TResult, TSpan>>
    }) as (...args: TArgs) => Promise<TraceFnReturn<TResult, TSpan>>
  }

  return ((...args: TArgs) => {
    return runSpanSync(
      name,
      () => (fn as (...args: TArgs) => TResult)(...args),
      buildRunSpanOptions(args, options, name, marker),
    ) as TraceFnReturn<TResult, TSpan>
  }) as (...args: TArgs) => TraceFnReturn<TResult, TSpan>
}
