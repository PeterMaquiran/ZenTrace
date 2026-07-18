import type { Span } from './core/span'

/**
 * Pino-compatible logger methods: `(bindings, message)` or `(message)`.
 * Bind with `p.info.bind(p)` — ZenTrace calls `info(fields, msg)`.
 */
export type Logger = {
  info: (bindings: object | string, message?: string) => unknown
  error: (bindings: object | string, message?: string) => unknown
  debug?: (bindings: object | string, message?: string) => unknown
  warn?: (bindings: object | string, message?: string) => unknown
}

export type CorrelatedLogBindings = {
  correlationId?: string
  traceId?: string
  spanId?: string
  parentSpanId?: string
  serviceName?: string
  spanName?: string
  [key: string]: unknown
}

/** @deprecated Use CorrelatedLogBindings — kept for callers that expect a message field. */
export type CorrelatedLogRecord = CorrelatedLogBindings & {
  level: string
  message: string
}

const LOGGER_KEY = '__ZENTRACE_LOGGER__'

type LoggerState = {
  logger?: Logger
}

function getState(): LoggerState {
  const globalRef = globalThis as typeof globalThis & {
    [LOGGER_KEY]?: LoggerState
  }

  if (!globalRef[LOGGER_KEY]) globalRef[LOGGER_KEY] = {}
  return globalRef[LOGGER_KEY]
}

/** Set the structured log sink used by ZenTrace and Span.console. */
export function setLogger(logger: Logger): void {
  getState().logger = logger
}

export function getLogger(): Logger | undefined {
  return getState().logger
}

export function resetLogger(): void {
  delete getState().logger
}

export function createCorrelatedBindings(
  span?: Span,
  fields?: Record<string, unknown>,
): CorrelatedLogBindings {
  const bindings: CorrelatedLogBindings = { ...fields }
  if (!span) return bindings

  return {
    ...bindings,
    correlationId: span.context.traceId,
    traceId: span.context.traceId,
    spanId: span.context.spanId,
    ...(span.context.parentId ? { parentSpanId: span.context.parentId } : {}),
    serviceName: span.serviceName,
    spanName: span.name,
  }
}

/** @deprecated Prefer createCorrelatedBindings + separate message for Pino. */
export function createCorrelatedLogRecord(
  level: string,
  message: string,
  span?: Span,
): CorrelatedLogRecord {
  return {
    level,
    message,
    ...createCorrelatedBindings(span),
  }
}

/**
 * Write via the configured logger using Pino's `(bindings, message)` shape.
 */
export function writeStructuredLog(
  level: 'debug' | 'info' | 'warn' | 'error',
  message: string,
  span?: Span,
  fields?: Record<string, unknown>,
): boolean {
  const logger = getLogger()
  if (!logger) return false

  const method =
    logger[level] ??
    (level === 'debug' || level === 'warn' ? logger.info : undefined)
  if (!method) return false

  const bindings = createCorrelatedBindings(span, fields)
  if (Object.keys(bindings).length > 0) method(bindings, message)
  else method(message)

  return true
}
