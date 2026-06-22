import type { SpanData } from '../../core/types'

export function emitTrace(data: SpanData) {
  window.postMessage(
    { source: 'zentrace', type: 'TRACE_EVENT', payload: data },
    '*',
  )
}
