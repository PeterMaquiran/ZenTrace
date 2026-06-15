import type { SpanData } from '../core/types'

declare global {
  interface Window {
    __TRACE__: TraceBus
  }
}

type TraceListener = (data: SpanData) => void

export interface TraceBus {
  subscribe: (listener: TraceListener) => () => void
  push: (data: SpanData) => void
}
