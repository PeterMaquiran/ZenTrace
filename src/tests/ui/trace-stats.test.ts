import { describe, expect, it } from 'vitest'

import {
  computeTraceStats,
  filterTraceNodes,
  resolveSlowThresholdMs,
} from '../../../ui/trace-stats'
import type { FlatRenderNode } from '../../../ui/types'

function node(
  name: string,
  durationMs: number,
  overrides: Partial<FlatRenderNode['span']> = {},
): FlatRenderNode {
  return {
    id: name,
    parentId: null,
    depth: 0,
    hasChildren: false,
    span: {
      name,
      startMs: 0,
      durationMs,
      colorHex: '#fff',
      children: [],
      ...overrides,
    },
  }
}

describe('trace stats', () => {
  it('computes slow threshold from total duration', () => {
    expect(resolveSlowThresholdMs(1000, 100)).toBe(200)
    expect(resolveSlowThresholdMs(50, 100)).toBe(100)
  })

  it('filters error spans', () => {
    const nodes = [node('ok', 10), node('bad', 20, { hasError: true })]

    expect(filterTraceNodes(nodes, 'errors')).toHaveLength(1)
    expect(filterTraceNodes(nodes, 'errors')[0]?.span.name).toBe('bad')
  })

  it('reports error count and slowest span', () => {
    const stats = computeTraceStats(
      [node('fast', 10), node('slow', 300, { hasError: true })],
      310,
    )

    expect(stats.errorCount).toBe(1)
    expect(stats.slowest?.span.name).toBe('slow')
  })
})
