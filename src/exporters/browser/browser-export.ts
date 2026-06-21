import type { SpanData } from '../../core/types'

export function emitTrace(data: SpanData) {
  window.postMessage(
    { source: 'devtrace', type: 'TRACE_EVENT', payload: data },
    '*',
  )
}
