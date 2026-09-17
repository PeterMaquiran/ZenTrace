import type { SpanData } from '../core/types.js'
import { writeStructuredLog } from '../logger.js'

import { emitTrace } from './browser/browser-export.js'
import { getExporters } from './registry.js'

export function dispatchSpan(data: SpanData): void {
  const span = normalizeSpanData(data)

  for (const exporter of getExporters()) {
    void exporter.export(span).catch((err: unknown) => {
      const detail = err instanceof Error ? err.message : String(err)
      const message = `[zentrace] exporter failed: ${detail}`
      if (!writeStructuredLog('error', message)) console.error(message)
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
