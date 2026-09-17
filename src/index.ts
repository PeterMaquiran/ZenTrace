export * from './core/tracer'
export * from './core/span'
export * from './core/context'
export * from './runtime/run-span'
export * from './runtime/decorator/decorator'
export * from './runtime/decorator/function'
export {
  getLogger,
  resetLogger,
  setLogger,
  type CorrelatedLogRecord,
  type Logger,
} from './logger'
export { emitTrace } from './exporters/browser/browser-export'
export {
  registerExporter,
  unregisterExporter,
  unregisterExportersById,
  clearExporters,
  getExporters,
  replaceExporter,
} from './exporters/registry'
export { dispatchSpan } from './exporters/dispatch'
export type { Exporter } from './exporters/base'
export type { SpanData } from './core/types'
export {
  enableAutoTracing,
  disableAutoTracing,
  traceFetch,
  installLogCapture,
  installHttpTracing,
} from './instrumentation/index'
export {
  configureZenTrace,
  getZenTraceConfig,
  resetZenTraceConfig,
  clearTraceSession,
  createTraceSession,
  extractTestMeta,
  getTraceSession,
  setTraceSession,
  SESSION_TAGS,
  type ZenTraceConfig,
  type TraceSession,
} from './testing/index'
export {
  attachZenTrace,
  createSessionFromTestInfo,
  zenTraceSessionInitScript,
  type ZenTracePage,
  type ZenTraceTestInfo,
} from './playwright/index'

// export * from "./propagation/headers";
// export * from "./propagation/extract";
// export * from "./propagation/inject";

// export * from "./exporters";
