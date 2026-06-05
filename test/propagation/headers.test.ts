import { describe, it, expect } from 'vitest'
import { Tracer } from '../../src/core/tracer'
import { MockExporter } from '../mocks/mock-exporter'
import { getTraceHeaders } from '@/propagation/headers'

describe('Propagation headers', () => {
  it('should generate trace headers', () => {
    const tracer = new Tracer('test-service', new MockExporter())

    const span = tracer.startSpan('test')

    const headers = getTraceHeaders(span.context)

    expect(headers['x-trace-id']).toBeDefined()
    expect(headers['x-span-id']).toBeDefined()
    expect(headers.traceparent).toContain(span.context.traceId)
  })
})
