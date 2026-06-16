import { describe, expect, it } from 'vitest'

import { collectFlatLogs } from '../../../ui/collect-logs'
import type { FlatRenderNode } from '../../../ui/types'

describe('collectFlatLogs', () => {
  it('flattens logs across spans in trace order', () => {
    const nodes: FlatRenderNode[] = [
      {
        id: 'root',
        parentId: null,
        depth: 0,
        hasChildren: true,
        span: {
          name: 'root',
          startMs: 0,
          durationMs: 100,
          colorHex: '#fff',
          children: [],
          logs: [
            { level: 'log', message: 'first', timestampMs: 10 },
            { level: 'warn', message: 'second', timestampMs: 20 },
          ],
        },
      },
      {
        id: 'child',
        parentId: 'root',
        depth: 1,
        hasChildren: false,
        span: {
          name: 'child',
          startMs: 30,
          durationMs: 50,
          colorHex: '#000',
          children: [],
          logs: [{ level: 'info', message: 'child log', timestampMs: 40 }],
        },
      },
    ]

    const entries = collectFlatLogs(nodes, [], 0)
    expect(entries).toHaveLength(3)
    expect(entries.map((entry) => entry.log.message)).toEqual([
      'first',
      'second',
      'child log',
    ])
    expect(entries[2]?.nodeId).toBe('child')
  })
})
