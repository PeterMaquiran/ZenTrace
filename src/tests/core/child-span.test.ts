import { describe, it, expect } from 'vitest'

import { Tracer } from '../../core/tracer'

describe('Child Span', () => {
  it('should propagate trace context', async () => {
    const tracer = new Tracer('test-service')

    const parent = tracer.startSpan('parent')
    const child = parent.child('child-operation')

    await child.end()
    await parent.end()

    expect(parent.children.length).toBe(1)

    expect(child.context.traceId).toBe(parent.context.traceId)
    expect(child.context.parentId).toBe(parent.context.spanId)
  })
})
