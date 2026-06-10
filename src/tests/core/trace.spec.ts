import { describe, it, expect, beforeEach } from 'vitest'

import { Span, trace } from '@/index'

class TestService {
  @trace({ captureArgs: true, captureResult: true })
  async sum(a: number, b: number, _span?: Span) {
    return a + b
  }

  @trace({ captureArgs: true })
  async fail() {
    throw new Error('boom')
  }

  @trace({ captureArgs: true, captureResult: true, ...{ span: true } })
  async returnSpan() {
    return 123 as any
  }

  @trace({ captureArgs: true, captureResult: true })
  async injectSpan(a: number, b: number, span?: Span) {
    expect(span).toBeInstanceOf(Span)
    return a + b
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

  it('injects span into method', async () => {
    const result = await service.injectSpan(2, 3)
    expect(result).toBe(5)
  })

  it('throws errors correctly', async () => {
    await expect(service.fail()).rejects.toThrow('boom')
  })

  it('returns span when configured', async () => {
    const result = await service.returnSpan()
    expect(result).toBeInstanceOf(Span)
  })
})
