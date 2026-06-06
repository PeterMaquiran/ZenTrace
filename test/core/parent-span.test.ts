import { describe, it, expect } from 'vitest'

import { Tracer } from '../../src/core/tracer'

describe('Parent span', () => {
  it('builds nested trace tree', async () => {
    const tracer = new Tracer('test-service')

    const root = tracer.startSpan('getUser')

    const child1 = root.child('fetchUser')
    await new Promise((r) => setTimeout(r, 10))
    await child1.end()

    const child2 = root.child('validateUser')
    await new Promise((r) => setTimeout(r, 5))
    await child2.end()

    await root.end()

    expect(root.name).toBe('getUser')
    expect(root.children.length).toBe(2)
    expect(root.children[0].name).toBe('fetchUser')
    expect(root.children[1].name).toBe('validateUser')
  })
})
