import { describe, it, expect } from 'vitest'
import { Tracer } from '../../src/core/tracer'
import { MockExporter } from '../mocks/mock-exporter'

describe('Span', () => {
  it('should create and export a span', async () => {
    const exporter = new MockExporter()
    const tracer = new Tracer('test-service', exporter)

    const span = tracer.startSpan('root')

    span.addAttribute('env', 'test')
    span.addEvent('started')

    await span.end()

    expect(exporter.spans.length).toBe(1)

    const exported = exporter.spans[0]

    expect(exported.name).toBe('root')
    expect(exported.tags.env).toBe('test')
    expect(exported.annotations.length).toBe(1)
  })
})
