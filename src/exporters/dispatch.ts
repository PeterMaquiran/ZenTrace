import type { SpanData } from '../core/types'

import { emitTrace } from './browser/browser-export'
import { getExporters } from './registry'

export function dispatchSpan(data: SpanData): void {
  const span = normalizeSpanData(data)

  for (const exporter of getExporters()) {
    void exporter.export(span).catch((err: unknown) => {
      console.error('[zentrace] exporter failed:', err)
    })
  }

  if (typeof window !== 'undefined') {
    emitTrace(span)
  }
}

/** Zipkin-compatible integers (µs). performance.now() durations are floats. */
function normalizeSpanData(data: SpanData): SpanData {
  return {
    ...data,
    timestamp: Math.round(data.timestamp),
    duration:
      data.duration === undefined ? undefined : Math.round(data.duration),
    annotations: data.annotations?.map((a) => ({
      ...a,
      timestamp: Math.round(a.timestamp),
    })),
  }
}
