import type { FlatRenderNode } from './types'

export const TIMELINE_MIN_BAR_WIDTH_PX = 4

export function resolveTimelineTotalMs(
  nodes: FlatRenderNode[],
  declaredTotalMs: number,
): number {
  let maxEnd = declaredTotalMs

  for (const { span } of nodes) {
    maxEnd = Math.max(maxEnd, span.startMs + span.durationMs)
  }

  return Math.max(maxEnd, 1)
}

export function spanTimelineMetrics(
  startMs: number,
  durationMs: number,
  totalMs: number,
) {
  const safeTotal = Math.max(totalMs, 1)
  const leftPercent = (startMs / safeTotal) * 100
  const widthPercent = (durationMs / safeTotal) * 100
  const percentOfTrace = widthPercent

  return { leftPercent, widthPercent, percentOfTrace }
}

export function formatTracePercent(value: number): string {
  if (value >= 10) return `${Math.round(value)}`
  if (value >= 1) return value.toFixed(1)
  if (value > 0) return value.toFixed(2)
  return '0'
}
