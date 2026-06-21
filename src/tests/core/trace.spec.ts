import { describe, it, expect, beforeEach } from 'vitest'

import { Span, trace } from '@/index'

class TestService {
  @trace({ captureArgs: true, captureResult: true })
  async sum(a: number, b: number) {
    return a + b
  }

  @trace({ captureArgs: true })
  async fail() {
    throw new Error('boom')
  }

  @trace({ captureArgs: true, captureResult: true, span: true })
  async returnSpan() {
    return 123
  }
}

describe('trace decorator', () => {
  let service: TestService

  beforeEach(() => {
    service = new TestService()
  })

  it('traces successful execution', async () => {
    const result = await service.sum(1, 2)
    expect(result).toBe(3)
  })

  it('throws errors correctly', async () => {
    await expect(service.fail()).rejects.toThrow('boom')
  })

  it('returns span when configured', async () => {
    const result = await service.returnSpan()
    expect(result).toBeInstanceOf(Span)
  })

  it('injects span as the last argument', async () => {
    let receivedSpan: unknown

    class SpanService {
      @trace({ captureArgs: true })
      async handle(value: string, span?: Span) {
        receivedSpan = span
        span?.addAttribute('operation', 'handle')
        return value
      }
    }

    const svc = new SpanService()
    await svc.handle('ok')

    expect(receivedSpan).toBeDefined()
    expect((receivedSpan as Span).attributes).toMatchObject({
      operation: 'handle',
    })
  })
})
