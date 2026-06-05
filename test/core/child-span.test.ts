import { describe, it, expect } from 'vitest'
import { Tracer } from '../../src/core/tracer'
import { MockExporter } from '../mocks/mock-exporter'

describe('Child Span', () => {
  it('should propagate trace context', async () => {
    const exporter = new MockExporter()
    const tracer = new Tracer('test-service', exporter)

    const parent = tracer.startSpan('parent')
    const child = parent.child('child-operation')

    await child.end()
    await parent.end()

    expect(exporter.spans.length).toBe(2)

    const [parentSpan, childSpan] = exporter.spans

    expect(childSpan.traceId).toBe(parentSpan.traceId)
    expect(childSpan.parentId).toBe(parentSpan.id)
  })
})
