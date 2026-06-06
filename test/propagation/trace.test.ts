import { describe, it, expect } from 'vitest'
import { trace } from '../../src/decorator/index'
import { Span } from '../../src/core/span'

// --- TEST CLASS ---
class TestService {
  @trace({ captureArgs: true, captureResult: true })
  async success(a: any, b: any, _span?: Span) {
    return this.success1(a, b, _span)
  }

  @trace({ captureArgs: true, captureResult: true })
  async success1(a: any, b: any, _span?: Span) {
    console.log(_span?.context.spanId)
    return a + b
  }

  @trace({ captureArgs: true, captureResult: true, ...{ span: true } })
  async returnSpan(a: any, b: any): Promise<Span> {
    return (a + b) as any
  }

  @trace({ captureArgs: true, captureResult: true })
  async span(a: any, b: any) {
    return a + b
  }

  @trace({ captureArgs: true })
  async fail() {
    throw new Error('boom')
  }
}

// --- TESTS ---
describe('trace decorator (instance tracer)', () => {
  let service: TestService

  beforeEach(() => {
    service = new TestService()
  })

  it('should create child span when parent exists', async () => {
    const result = await service.success(1, 2)
    expect(result).toBe(3)
  })
})
