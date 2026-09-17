import { describe, expect, it } from 'vitest'

import { Span, trace } from '@/index'

class CheckoutService {
  @trace({ name: 'checkout', span: true })
  async runCheckout() {
    return 1
  }

  @trace({ span: true })
  async validateToken() {
    return 1
  }
}

describe('@trace name', () => {
  it('uses options.name as the span name', async () => {
    const span = await new CheckoutService().runCheckout()
    expect(span).toBeInstanceOf(Span)
    expect((span as Span).name).toBe('checkout')
  })

  it('defaults to the method name', async () => {
    const span = await new CheckoutService().validateToken()
    expect((span as Span).name).toBe('validateToken')
  })
})
