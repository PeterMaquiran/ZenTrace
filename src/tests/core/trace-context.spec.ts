import { describe, it, expect } from 'vitest'

import { TraceContext } from '@/core/context'

describe('TraceContext', () => {
  it('creates root context', () => {
    const ctx = TraceContext.createRoot('trace-1', 'span-1')

    expect(ctx.traceId).toBe('trace-1')
    expect(ctx.spanId).toBe('span-1')
    expect(ctx.parentId).toBeNull()
  })

  it('creates child context', () => {
    const parent = TraceContext.createRoot('trace-1', 'span-1')
    const child = TraceContext.child(parent, 'span-2')

    expect(child.traceId).toBe(parent.traceId)
    expect(child.parentId).toBe(parent.spanId)
  })
})
