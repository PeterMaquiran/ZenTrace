import { describe, it, expect } from 'vitest'

import { Tracer } from '../../core/tracer'

describe('Span', () => {
  it('should create and export a span', async () => {
    const tracer = new Tracer('test-service')

    const span = tracer.startSpan('root')

    span.addAttribute('env', 'test')
    span.addEvent('started')

    await span.end()

    expect(span.children.length).toBe(0)

    expect(span.name).toBe('root')
    expect(span.toJSON().tags?.env).toBe('test')
    expect(span.toJSON().annotations?.length).toBe(1)
  })

  it('marks setAttribute keys as user attributes for Zipkin', async () => {
    const tracer = new Tracer('test-service')
    const span = tracer.startSpan('root')

    span.addAttribute('input', 'captured')
    span.setAttribute('orderId', 'order-1')
    span.setAttribute('input', { token: 'demo' })

    const json = span.toJSON()
    expect(json.tags?.input).toBe(JSON.stringify({ token: 'demo' }))
    expect(json.userAttributeKeys).toEqual(['orderId', 'input'])
  })
})
