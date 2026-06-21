import { describe, it, expect } from 'vitest'

import { Tracer } from '@/index'

describe('trace system integration', () => {
  it('propagates trace across spans', () => {
    const tracer = new Tracer('service')

    const root = tracer.startSpan('root')
    const child = root.child('child')
    const grandChild = child.child('grandchild')

    expect(grandChild.context.traceId).toBe(root.context.traceId)
    expect(grandChild.context.parentId).toBe(child.context.spanId)
  })
})
