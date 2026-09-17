import type { SpanData } from '../../core/types.js'

export function emitTrace(data: SpanData) {
  window.postMessage(
    { source: 'zentrace', type: 'TRACE_EVENT', payload: data },
    '*',
  )
}
