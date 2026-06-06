import { describe, it, expect, vi, beforeEach } from 'vitest'
import { trace } from '../../src/decorator/index'
import { Span } from '@/core/span'
import { Tracer } from '@/core/tracer'

// --- TEST CLASS ---
class TestService {
  @trace({ captureArgs: true, captureResult: true })
  async success(a: any, b: any, trace?: any) {
    return this.success1(a, b, trace)
  }

  @trace({ captureArgs: true, captureResult: true })
  async success1(a: any, b: any, trace?: any) {
    return a + b
  }

  @trace({ captureArgs: true, captureResult: true, ...{ span: true } })
  async returnSpan(a: any, b: any, trace?: any): Promise<Span> {
    return (a + b) as any
  }

  @trace({ captureArgs: true, captureResult: true })
  async span(a: any, b: any, trace?: any) {
    return a + b
  }

  @trace({ captureArgs: true })
  async fail(_a: any, trace?: any) {
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
