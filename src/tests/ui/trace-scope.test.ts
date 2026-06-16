import { describe, expect, it } from 'vitest'

import {
  filterSpansByRoot,
  findTraceRootId,
  latestRootSpanId,
  listTraceSummaries,
} from '../../../ui/trace-model'
import type { SpanData } from '../../core/types'

function span(
  id: string,
  parentId: string | null,
  timestamp: number,
): SpanData {
  return {
    id,
    parentId,
    name: id,
    timestamp,
    duration: 1000,
  }
}

describe('trace scope helpers', () => {
  it('finds the root span for a nested span', () => {
    const spans = [
      span('root-a', null, 1),
      span('child', 'root-a', 2),
      span('root-b', null, 10),
    ]

    expect(findTraceRootId(span('child', 'root-a', 2), spans)).toBe('root-a')
  })

  it('returns the latest root span id', () => {
    const spans = [
      span('root-a', null, 1),
      span('root-b', null, 10),
      span('child', 'root-b', 11),
    ]

    expect(latestRootSpanId(spans)).toBe('root-b')
  })

  it('filters spans to a single trace tree', () => {
    const spans = [
      span('root-a', null, 1),
      span('a-child', 'root-a', 2),
      span('root-b', null, 10),
      span('b-child', 'root-b', 11),
    ]

    expect(filterSpansByRoot(spans, 'root-b').map((item) => item.id)).toEqual([
      'root-b',
      'b-child',
    ])
  })
})

describe('listTraceSummaries', () => {
  it('lists root traces newest first with span counts', () => {
    const spans = [
      span('root-a', null, 1),
      span('a-child', 'root-a', 2),
      span('root-b', null, 10),
      span('b-child', 'root-b', 11),
    ]

    const summaries = listTraceSummaries(spans)
    expect(summaries.map((item) => item.rootId)).toEqual(['root-b', 'root-a'])
    expect(summaries[0]?.spanCount).toBe(2)
  })
})
