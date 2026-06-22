import type { SpanData } from '../core/types'
import type { TraceSession } from '../testing/session'

declare global {
  interface Window {
    __TRACE__: TraceBus
    __ZENTRACE_SESSION__?: TraceSession
  }
}

type TraceListener = (data: SpanData) => void

export interface TraceBus {
  subscribe: (listener: TraceListener) => () => void
  push: (data: SpanData) => void
}
