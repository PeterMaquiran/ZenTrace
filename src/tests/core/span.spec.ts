import { describe, it, expect } from 'vitest'

import { Tracer } from '@/core/tracer'

describe('Span', () => {
  const tracer = new Tracer('test-service')

  it('adds attributes', () => {
    const span = tracer.startSpan('test')

    span.addAttribute('key', 'value')

    expect(span.attributes.key).toBe('value')
  })

  it('adds events', () => {
    const span = tracer.startSpan('test')

    span.addEvent('something happened')

    expect(span.events.length).toBe(1)
  })

  it('creates child spans', () => {
    const span = tracer.startSpan('root')
    const child = span.child('child')

    expect(child.context.traceId).toBe(span.context.traceId)
    expect(child.context.parentId).toBe(span.context.spanId)
  })

  it('records errors', () => {
    const span = tracer.startSpan('error')

    span.recordError(new Error('boom'), 'failed')

    expect(span.attributes.error).toBe('true')
    expect(span.events.length).toBeGreaterThan(0)
  })

  it('generates headers', () => {
    const span = tracer.startSpan('http')

    const headers = span.getTraceHeaders()

    expect(headers['x-trace-id']).toBe(span.context.traceId)
    expect(headers['x-span-id']).toBe(span.context.spanId)
  })

  it('serializes span', async () => {
    const span = tracer.startSpan('serialize')

    await span.end()

    const json = span.toJSON(100)

    expect(json.name).toBe('serialize')
    expect(json.duration).toBe(100)
    expect(json.localEndpoint.serviceName).toBe('test-service')
  })
})
