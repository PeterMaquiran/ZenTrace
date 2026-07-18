import { afterEach, describe, expect, it, vi } from 'vitest'

import { TraceContext } from '../core/context'
import { Span } from '../core/span'
import { resetLogger, setLogger } from '../logger'

describe('setLogger', () => {
  afterEach(() => {
    resetLogger()
    vi.restoreAllMocks()
  })

  it('calls the logger with Pino-style (bindings, message)', () => {
    const info = vi.fn()
    setLogger({ info, error: vi.fn(), debug: vi.fn() })
    const span = new Span(
      'checkout',
      'checkout-api',
      new TraceContext('a'.repeat(32), 'b'.repeat(16), 'c'.repeat(16)),
    )

    span.console.info('payment accepted')

    expect(info).toHaveBeenCalledWith(
      {
        correlationId: 'a'.repeat(32),
        traceId: 'a'.repeat(32),
        spanId: 'b'.repeat(16),
        parentSpanId: 'c'.repeat(16),
        serviceName: 'checkout-api',
        spanName: 'checkout',
      },
      'payment accepted',
    )
  })

  it('keeps the message clean and merges object args as bindings', () => {
    const info = vi.fn()
    setLogger({ info, error: vi.fn(), debug: vi.fn() })
    const span = new Span(
      'checkout',
      'checkout-api',
      TraceContext.createRoot('a'.repeat(32), 'b'.repeat(16)),
    )

    span.console.log('checkout completed', {
      orderId: 'order-1',
      total: 113,
    })

    expect(info).toHaveBeenCalledWith(
      {
        orderId: 'order-1',
        total: 113,
        correlationId: 'a'.repeat(32),
        traceId: 'a'.repeat(32),
        spanId: 'b'.repeat(16),
        serviceName: 'checkout-api',
        spanName: 'checkout',
      },
      'checkout completed',
    )

    const stored = JSON.parse(span.attributes['zentrace.logs']!)
    expect(stored[0]).toMatchObject({
      level: 'log',
      message: 'checkout completed',
      fields: { orderId: 'order-1', total: 113 },
    })
  })

  it('falls back to info when the configured logger has no warn method', () => {
    const info = vi.fn()
    setLogger({ info, error: vi.fn() })
    const span = new Span(
      'checkout',
      'checkout-api',
      TraceContext.createRoot('a'.repeat(32), 'b'.repeat(16)),
    )

    span.console.warn('slow gateway')

    expect(info).toHaveBeenCalledWith(
      expect.objectContaining({
        correlationId: 'a'.repeat(32),
        spanName: 'checkout',
      }),
      'slow gateway',
    )
  })
})
