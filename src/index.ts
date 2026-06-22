export * from './core/tracer'
export * from './core/span'
export * from './core/context'
export * from './runtime/run-span'
export { activeSpan, getActiveSpan } from './runtime/active-span'
export * from './runtime/decorator/decorator'
export * from './runtime/decorator/function'
export { emitTrace } from './exporters/browser/browser-export'
export {
  enableAutoTracing,
  disableAutoTracing,
  traceFetch,
  installLogCapture,
  installHttpTracing,
} from './instrumentation/index'
export {
  configureDevTrace,
  getDevTraceConfig,
  resetDevTraceConfig,
  clearTraceSession,
  createTraceSession,
  extractTestMeta,
  getTraceSession,
  setTraceSession,
  SESSION_TAGS,
  type DevTraceConfig,
  type TraceSession,
} from './testing/index'
export {
  attachDevTrace,
  createSessionFromTestInfo,
  devTraceSessionInitScript,
  type DevTracePage,
  type DevTraceTestInfo,
} from './playwright/index'

// export * from "./propagation/headers";
// export * from "./propagation/extract";
// export * from "./propagation/inject";

// export * from "./exporters";
