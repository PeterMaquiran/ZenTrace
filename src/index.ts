export * from './core/tracer.js'
export * from './core/span.js'
export * from './core/context.js'
export * from './runtime/run-span.js'
export * from './runtime/decorator/decorator.js'
export * from './runtime/decorator/function.js'
export {
  getLogger,
  resetLogger,
  setLogger,
  type CorrelatedLogRecord,
  type Logger,
} from './logger.js'
export { emitTrace } from './exporters/browser/browser-export.js'
export {
  registerExporter,
  unregisterExporter,
  unregisterExportersById,
  clearExporters,
  getExporters,
  replaceExporter,
} from './exporters/registry.js'
export { dispatchSpan } from './exporters/dispatch.js'
export type { Exporter } from './exporters/base.js'
export type { SpanData } from './core/types.js'
export {
  traceFetch,
  installLogCapture,
  installHttpTracing,
} from './instrumentation/index.js'
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
} from './testing/index.js'
export {
  attachZenTrace,
  createSessionFromTestInfo,
  zenTraceSessionInitScript,
  type ZenTracePage,
  type ZenTraceTestInfo,
} from './playwright/index.js'

// export * from "./propagation/headers";
// export * from "./propagation/extract";
// export * from "./propagation/inject";

// export * from "./exporters";
