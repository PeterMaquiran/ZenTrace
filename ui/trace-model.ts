import type { SpanData } from '../src/core/types'

import type { TraceEvent, TraceNode, TraceViewData } from './types'

export type { TraceViewData }

const MODULE_COLORS: Record<string, string> = {
  auth: '#ffb300',
  payment: '#f44336',
  frontend: '#4caf50',
  demo: '#0084ff',
}

function colorForSpan(span: SpanData): string {
  const module = span.tags?.module
  if (module && MODULE_COLORS[module]) return MODULE_COLORS[module]
  return hashColor(span.name)
}

function hashColor(value: string): string {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash)
  }
  return `hsl(${hash % 360} 70% 55%)`
}

function toMs(microseconds: number): number {
  return microseconds / 1000
}

function buildNode(
  span: SpanData,
  allSpans: SpanData[],
  traceStartUs: number,
): TraceNode {
  const children = allSpans
    .filter((candidate) => candidate.parentId === span.id)
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((child) => buildNode(child, allSpans, traceStartUs))

  const durationMs = span.duration
    ? toMs(span.duration)
    : Number(span.tags?.duration_ms ?? 0)

  return {
    name: span.name,
    startMs: toMs(span.timestamp - traceStartUs),
    durationMs: Math.max(durationMs, 1),
    colorHex: colorForSpan(span),
    input: span.tags?.input,
    output: span.tags?.output,
    events: span.annotations?.map(
      (annotation): TraceEvent => ({
        name: annotation.value,
        timestampMs: toMs(annotation.timestamp - traceStartUs),
      }),
    ),
    children,
  }
}

export function buildTraceView(spans: SpanData[]): TraceViewData | null {
  if (spans.length === 0) return null

  const traceStartUs = Math.min(...spans.map((span) => span.timestamp))
  const roots = spans
    .filter((span) => !span.parentId)
    .sort((a, b) => a.timestamp - b.timestamp)

  if (roots.length === 0) return null

  const rootNodes = roots.map((root) => buildNode(root, spans, traceStartUs))

  if (rootNodes.length === 1) {
    const root = rootNodes[0]
    return {
      totalDurationMs: Math.max(
        root.startMs + root.durationMs,
        root.durationMs,
      ),
      rootSpan: root,
    }
  }

  const totalDurationMs = Math.max(
    ...rootNodes.map((node) => node.startMs + node.durationMs),
    1,
  )

  return {
    totalDurationMs,
    rootSpan: {
      name: 'trace',
      startMs: 0,
      durationMs: totalDurationMs,
      colorHex: '#4caf50',
      children: rootNodes,
    },
  }
}
