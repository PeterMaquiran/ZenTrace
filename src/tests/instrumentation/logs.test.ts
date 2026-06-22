import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import type { Span } from '@/index'
import { installLogCapture, uninstallLogCapture } from '@/instrumentation/logs'
import { trace } from '@/runtime/decorator/decorator'
import { SpanStorage } from '@/storage/memory-storage'


class LogService {
  @trace({ module: 'logs' })
  async run(message: string) {
    console.log(message)
    return message
  }

  @trace({ module: 'logs' })
  async nested(message: string) {
    return this.run(message)
  }
}

describe('log capture', () => {
  beforeEach(() => {
    SpanStorage.clear()
    installLogCapture()
  })

  afterEach(() => {
    uninstallLogCapture()
  })

  it('attaches console logs to the active span', async () => {
    const service = new LogService()
    await service.run('hello trace')

    const span = SpanStorage.getAll().find((item) => item.name === 'run')
    expect(
      span?.events.some((event) => event.value.includes('hello trace')),
    ).toBe(true)
  })

  it('attributes logs to the innermost span, not the parent', async () => {
    const service = new LogService()
    await service.nested('nested hello')

    const parent = SpanStorage.getAll().find((item) => item.name === 'nested')
    const child = SpanStorage.getAll().find((item) => item.name === 'run')

    expect(
      child?.events.some((event) => event.value.includes('nested hello')),
    ).toBe(true)
    expect(
      parent?.events.some((event) => event.value.includes('nested hello')),
    ).toBe(false)
  })

  it('span.console keeps logs on the target span during parallel traces', async () => {
    class OrderService {
      @trace({ module: 'orders' })
      async createOrder(orderId: string, span?: Span) {
        span?.console.info('creating order', orderId)

        await Promise.all([
          this.reserveStock(orderId, span!),
          this.estimateShipping(orderId, span!),
        ])

        span?.console.log('order assembled', { orderId })
        return orderId
      }

      @trace({ module: 'inventory' })
      async reserveStock(orderId: string, span: Span) {
        void orderId
        void span
        await new Promise((resolve) => setTimeout(resolve, 30))
      }

      @trace({ module: 'shipping' })
      async estimateShipping(orderId: string, span: Span) {
        void orderId
        void span
        await new Promise((resolve) => setTimeout(resolve, 20))
      }
    }

    const service = new OrderService()
    await Promise.all([
      service.createOrder('order-A'),
      service.createOrder('order-B'),
    ])

    const createOrders = SpanStorage.getAll().filter(
      (span) => span.name === 'createOrder',
    )
    const reserveStocks = SpanStorage.getAll().filter(
      (span) => span.name === 'reserveStock',
    )

    expect(createOrders).toHaveLength(2)
    expect(reserveStocks).toHaveLength(2)

    for (const span of createOrders) {
      const logs = span.attributes['zentrace.logs'] ?? ''
      expect(logs).toContain('creating order')
      expect(logs).toContain('order assembled')
    }

    for (const span of reserveStocks) {
      const logs = span.attributes['zentrace.logs'] ?? ''
      expect(logs).not.toContain('order assembled')
      expect(logs).not.toContain('creating order')
    }
  })

  it('captures logs that happen after an await', async () => {
    class DelayedLogService {
      @trace({ module: 'logs' })
      async run(message: string) {
        await new Promise((resolve) => setTimeout(resolve, 5))
        console.info(message)
        return message
      }
    }

    const service = new DelayedLogService()
    await service.run('after await')

    const span = SpanStorage.getAll().find((item) => item.name === 'run')
    expect(
      span?.events.some((event) => event.value.includes('after await')),
    ).toBe(true)
    expect(span?.attributes['zentrace.logs']).toContain('after await')
  })
})
