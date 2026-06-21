import { runSpan, runSpanSync } from '../core/run-span'
import { Span } from '../core/span'
import type { Span as SpanType } from '../core/span'
import { getDevTraceConfig } from '../testing/configure'

import type { TraceOptions } from './decorator'

type TraceFnOptions<TSpan extends boolean | undefined = false> =
  TraceOptions & {
    name?: string
    marker?: string
    span?: TSpan
  }

type TraceFnRuntimeOptions = TraceOptions & {
  name?: string
  marker?: string
  span?: boolean
}

type TraceFnReturn<
  TResult,
  TSpan extends boolean | undefined,
> = TSpan extends true ? SpanType : TResult

function isSpan(value: unknown): value is SpanType {
  return value instanceof Span
}

function resolveTraceFnArgs(
  optionsOrParent?: TraceFnRuntimeOptions | SpanType,
): { options: TraceFnRuntimeOptions; parentSpan?: SpanType } {
  if (isSpan(optionsOrParent)) {
    return { options: {}, parentSpan: optionsOrParent }
  }
  return { options: optionsOrParent ?? {} }
}

function buildRunSpanOptions(
  args: unknown[],
  options: TraceFnRuntimeOptions,
  parentSpan?: SpanType,
) {
  const defaults = getDevTraceConfig()

  return {
    module: options.module,
    captureArgs:
      (options.captureArgs ?? defaults.captureArgs) ? args : undefined,
    captureResult: options.captureResult ?? defaults.captureResult,
    returnSpan: options.span,
    marker: options.marker ?? options.name,
    parentSpan,
  }
}

function invokeWithSpan<TArgs extends unknown[], TResult>(
  fn: (...args: any[]) => any,
  args: TArgs,
  span: SpanType,
  injectSpan: boolean,
): TResult {
  if (injectSpan) {
    return fn(...args, span)
  }
  return fn(...args)
}

// ------------------------------------------
// 1. Sync / async WITH span in signature
// ------------------------------------------
export function traceFn<
  TArgs extends unknown[],
  TResult,
  TSpan extends boolean | undefined = false,
>(
  fn: (...args: [...TArgs, span: SpanType]) => TResult,
  options?: TraceFnOptions<TSpan>,
): (...args: TArgs) => TraceFnReturn<TResult, TSpan>

// ------------------------------------------
// 2. Sync WITHOUT span
// ------------------------------------------
export function traceFn<
  TArgs extends unknown[],
  TResult,
  TSpan extends boolean | undefined = false,
>(
  fn: (...args: TArgs) => TResult,
  options?: TraceFnOptions<TSpan>,
): (...args: TArgs) => TraceFnReturn<TResult, TSpan>

// ------------------------------------------
// 3. Async WITHOUT span
// ------------------------------------------
export function traceFn<
  TArgs extends unknown[],
  TResult,
  TSpan extends boolean | undefined = false,
>(
  fn: (...args: TArgs) => Promise<TResult>,
  options?: TraceFnOptions<TSpan>,
): (...args: TArgs) => Promise<TraceFnReturn<TResult, TSpan>>

// ------------------------------------------
// 4. Async WITH span
// ------------------------------------------
export function traceFn<
  TArgs extends unknown[],
  TResult,
  TSpan extends boolean | undefined = false,
>(
  fn: (...args: [...TArgs, span: SpanType]) => Promise<TResult>,
  options?: TraceFnOptions<TSpan>,
): (...args: TArgs) => Promise<TraceFnReturn<TResult, TSpan>>

// ------------------------------------------
// 5. Parent span overload
// ------------------------------------------
export function traceFn<
  TArgs extends unknown[],
  TResult,
  TSpan extends boolean | undefined = false,
>(
  fn: (...args: TArgs) => TResult | Promise<TResult>,
  parentSpan: SpanType,
  options?: TraceFnOptions<TSpan>,
): (
  ...args: TArgs
) => TraceFnReturn<TResult, TSpan> | Promise<TraceFnReturn<TResult, TSpan>>

// ------------------------------------------
// IMPLEMENTATION
// ------------------------------------------
export function traceFn<
  TArgs extends unknown[],
  TResult,
  TSpan extends boolean | undefined = false,
>(
  fn: any,
  optionsOrParent?: TraceFnOptions<TSpan> | SpanType,
  maybeOptions?: TraceFnOptions<TSpan>,
) {
  let options: TraceFnRuntimeOptions
  let parentSpan: SpanType | undefined

  if (isSpan(optionsOrParent)) {
    parentSpan = optionsOrParent
    options = (maybeOptions ?? {}) as TraceFnRuntimeOptions
  } else {
    ;({ options, parentSpan } = resolveTraceFnArgs(optionsOrParent))
  }

  const name = options.name ?? fn.name ?? 'anonymous'

  const injectSpan = /span/i.test(fn.toString()) // fallback heuristic

  const isAsync = fn.constructor.name === 'AsyncFunction'

  const runOptions = (args: unknown[]) =>
    buildRunSpanOptions(args, options, parentSpan)

  if (isAsync) {
    return (...args: TArgs) => {
      return runSpan(
        name,
        (span) => invokeWithSpan<TArgs, TResult>(fn, args, span, injectSpan),
        runOptions(args),
      )
    }
  }

  return (...args: TArgs) => {
    return runSpanSync(
      name,
      (span) => invokeWithSpan<TArgs, TResult>(fn, args, span, injectSpan),
      runOptions(args),
    )
  }
}
