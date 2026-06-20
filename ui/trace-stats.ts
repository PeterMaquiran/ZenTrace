import { spanTimelineMetrics } from './timeline-metrics'
import type { FlatRenderNode, TraceNode, TraceViewData } from './types'

export type TraceFilter = 'all' | 'errors' | 'slow'

export type TraceStats = {
  spanCount: number
  errorCount: number
  totalDurationMs: number
  slowThresholdMs: number
  slowest?: FlatRenderNode
  p95DurationMs: number
}

export function resolveSlowThresholdMs(
  totalDurationMs: number,
  configuredMs = 100,
): number {
  return Math.max(configuredMs, totalDurationMs * 0.2)
}

export function computeTraceStats(
  nodes: FlatRenderNode[],
  totalDurationMs: number,
  configuredSlowMs = 100,
): TraceStats {
  const slowThresholdMs = resolveSlowThresholdMs(
    totalDurationMs,
    configuredSlowMs,
  )
  const durations = nodes
    .map((node) => node.span.durationMs)
    .sort((a, b) => a - b)

  let errorCount = 0
  let slowest: FlatRenderNode | undefined

  for (const node of nodes) {
    if (node.span.hasError) errorCount++
    if (!slowest || node.span.durationMs > slowest.span.durationMs) {
      slowest = node
    }
  }

  const p95Index = Math.max(0, Math.ceil(durations.length * 0.95) - 1)

  return {
    spanCount: nodes.length,
    errorCount,
    totalDurationMs,
    slowThresholdMs,
    slowest,
    p95DurationMs: durations[p95Index] ?? 0,
  }
}

export function enrichNodesWithPerformance(
  nodes: FlatRenderNode[],
  totalDurationMs: number,
  slowThresholdMs: number,
): FlatRenderNode[] {
  return nodes.map((node) => {
    const { percentOfTrace } = spanTimelineMetrics(
      node.span.startMs,
      node.span.durationMs,
      totalDurationMs,
    )

    return {
      ...node,
      span: {
        ...node.span,
        percentOfTrace,
        isSlow: node.span.durationMs >= slowThresholdMs,
      },
    }
  })
}

export function filterTraceNodes(
  nodes: FlatRenderNode[],
  filter: TraceFilter,
): FlatRenderNode[] {
  if (filter === 'errors') {
    return nodes.filter((node) => node.span.hasError)
  }

  if (filter === 'slow') {
    return nodes.filter((node) => node.span.isSlow)
  }

  return nodes
}

export function formatTestLabel(
  meta?: TraceViewData['testMeta'],
): string | null {
  if (!meta?.title) return null
  if (meta.file) {
    const fileName = meta.file.split('/').pop()
    return `${meta.title} · ${fileName}`
  }
  return meta.title
}

export function walkTraceNodes(
  root: TraceNode,
  visitor: (node: TraceNode) => void,
): void {
  visitor(root)
  for (const child of root.children) {
    walkTraceNodes(child, visitor)
  }
}
