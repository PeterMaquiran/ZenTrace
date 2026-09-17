import { Span, trace } from 'zentrace'

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

class PaymentGateway {
  private attempts = 0

  @trace({ name: 'gateway', captureArgs: true, captureResult: true })
  async charge(amount: number, span: Span) {
    span.setAttribute('amount', amount)
    return this.retryWithBackoff(() => this.callProvider(amount, span), 3, span)
  }

  @trace({ name: 'gateway', captureArgs: true })
  async callProvider(amount: number, span: Span) {
    this.attempts += 1
    span.setAttribute('amount', amount)
    span.setAttribute('attempt', this.attempts)
    await sleep(70)
    span.console.warn('gateway attempt', this.attempts)

    if (this.attempts < 3) {
      throw new Error(`Gateway timeout (attempt ${this.attempts})`)
    }

    const chargeId = `ch_${Date.now()}`
    span.setAttribute('provider', 'stripe-mock')
    span.setAttribute('chargeId', chargeId)
    span.console.info('gateway charge succeeded', { amount })
    return { provider: 'stripe-mock', amount, chargeId }
  }

  @trace({ name: 'gateway', captureArgs: true })
  async retryWithBackoff<T>(
    fn: () => Promise<T>,
    retries: number,
    span: Span,
  ): Promise<T> {
    let lastError: unknown

    span.setAttribute('retries', retries)

    for (let attempt = 1; attempt <= retries; attempt++) {
      span.setAttribute('attempt', attempt)
      try {
        return await fn()
      } catch (error) {
        lastError = error
        span.console.error('charge failed, retrying', {
          attempt,
          error: String(error),
        })
        await sleep(50 * attempt)
      }
    }

    throw lastError
  }
}

class BillingService {
  constructor(private gateway = new PaymentGateway()) {}

  @trace({ name: 'billing', captureArgs: true, captureResult: true })
  async processInvoice(invoiceId: string, span?: Span) {
    span?.setAttribute('invoiceId', invoiceId)
    span?.console.info('processing invoice', invoiceId)
    const charge = await this.gateway.charge(149.99, span!)
    span?.setAttribute('status', 'paid')
    span?.setAttribute('amount', charge.amount)
    return { invoiceId, status: 'paid', charge }
  }
}

export function runErrorRetryExample(invoiceId = `inv-${Date.now()}`) {
  const billing = new BillingService(new PaymentGateway())
  return billing.processInvoice(invoiceId)
}
