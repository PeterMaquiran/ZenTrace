import { describe, it, expect, beforeEach } from 'vitest'

import type { Span } from '../../decorator/decorator'
import { trace } from '../../decorator/decorator'
import { SpanStorage } from '../../storage/memory-storage'

class TestService {
  @trace({ captureArgs: true, captureResult: true })
  async success(a: number, b: number) {
    return this.success1(a, b)
  }

  @trace({ captureArgs: true, captureResult: true })
  async success1(a: number, b: number) {
    return a + b
  }

  @trace({ captureArgs: true, captureResult: true, span: true })
  async returnSpan(a: number, b: number): Promise<Span> {
    return (a + b) as unknown as Span
  }

  @trace({ captureArgs: true })
  async fail() {
    throw new Error('boom')
  }
}

describe('automatic trace propagation', () => {
  let service: TestService

  beforeEach(() => {
    SpanStorage.clear()
    service = new TestService()
  })

  it('links nested traced calls via stack context', async () => {
    const result = await service.success(1, 2)
    expect(result).toBe(3)

    const spans = SpanStorage.getAll()
    expect(spans.length).toBe(2)

    const child = spans.find((span) => span.name === 'success1')
    const parent = spans.find((span) => span.name === 'success')

    expect(child).toBeDefined()
    expect(parent).toBeDefined()
    expect(child?.context.parentId).toBe(parent?.context.spanId)
    expect(child?.context.traceId).toBe(parent?.context.traceId)
  })
})
