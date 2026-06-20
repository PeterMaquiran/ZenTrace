import { describe, expect, it } from 'vitest'

import {
  formatTracePercent,
  resolveTimelineTotalMs,
  spanTimelineMetrics,
} from '../../../ui/timeline-metrics'
import type { FlatRenderNode } from '../../../ui/types'

function node(startMs: number, durationMs: number): FlatRenderNode {
  return {
    id: 'n',
    parentId: null,
    depth: 0,
    hasChildren: false,
    span: {
      name: 'n',
      startMs,
      durationMs,
      colorHex: '#fff',
      children: [],
    },
  }
}

describe('timeline metrics', () => {
  it('extends timeline total to the latest span end', () => {
    const nodes = [node(0, 100), node(80, 40)]

    expect(resolveTimelineTotalMs(nodes, 100)).toBe(120)
  })

  it('computes bar position and width from trace wall clock', () => {
    const metrics = spanTimelineMetrics(25, 50, 200)

    expect(metrics.leftPercent).toBe(12.5)
    expect(metrics.widthPercent).toBe(25)
    expect(metrics.percentOfTrace).toBe(25)
  })

  it('formats small percentages without rounding to zero', () => {
    expect(formatTracePercent(0.35)).toBe('0.35')
    expect(formatTracePercent(4.2)).toBe('4.2')
    expect(formatTracePercent(12.6)).toBe('13')
  })
})
