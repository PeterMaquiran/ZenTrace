import type { SpanData } from '../src/core/types'

import { extractLogs } from './span-details'
import type { FlatRenderNode, TraceLog } from './types'

export interface FlatLogEntry {
  entryId: string
  nodeId: string
  spanName: string
  colorHex: string
  spanStartMs: number
  log: TraceLog
}

export function collectFlatLogs(
  flatNodes: FlatRenderNode[],
  liveSpans: SpanData[],
  traceStartUs: number,
): FlatLogEntry[] {
  const entries: FlatLogEntry[] = []

  for (const node of flatNodes) {
    const rawSpan = node.span.spanId
      ? liveSpans.find((item) => item.id === node.span.spanId)
      : undefined
    const logs = rawSpan
      ? extractLogs(rawSpan, traceStartUs)
      : (node.span.logs ?? [])

    logs.forEach((log, index) => {
      entries.push({
        entryId: `${node.id}:${index}:${log.timestampMs}`,
        nodeId: node.id,
        spanName: node.span.name,
        colorHex: node.span.colorHex,
        spanStartMs: node.span.startMs,
        log,
      })
    })
  }

  return entries.sort((a, b) => a.log.timestampMs - b.log.timestampMs)
}
