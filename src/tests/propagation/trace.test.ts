import { describe, it, expect, beforeEach } from 'vitest'

import type { Span } from '../../runtime/decorator/decorator'
import { trace } from '../../runtime/decorator/decorator'
import { SpanStorage } from '../../storage/memory-storage'

class TestService {
  @trace({ captureArgs: true, captureResult: true })
  async success(a: number, b: number, span?: Span) {
    return this.success1(a, b, span)
  }

  @trace({ captureArgs: true, captureResult: true })
  async success1(a: number, b: number, span?: Span) {
    span?.addAttribute('operation', 'success1')
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

describe('manual trace propagation', () => {
  let service: TestService

  beforeEach(() => {
    SpanStorage.clear()
    service = new TestService()
  })

  it('links nested traced calls when parent span is passed as last argument', async () => {
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

  it('does not link nested traced calls without an explicit parent span', async () => {
    class UnlinkedService {
      @trace()
      async outer(value: string) {
        return this.inner(value)
      }

      @trace()
      async inner(value: string) {
        return value
      }
    }

    const unlinked = new UnlinkedService()
    await unlinked.outer('x')

    const spans = SpanStorage.getAll()
    expect(spans.length).toBe(2)

    const outer = spans.find((span) => span.name === 'outer')
    const inner = spans.find((span) => span.name === 'inner')

    expect(outer?.context.parentId).toBeNull()
    expect(inner?.context.parentId).toBeNull()
    expect(outer?.context.traceId).not.toBe(inner?.context.traceId)
  })
})
