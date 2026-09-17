import { configureZenTrace, Span, trace } from 'zentrace'
import { enableZipkinExport } from 'zentrace/exporters/zipkin'
import { enableLokiExport } from 'zentrace/exporters/loki'

configureZenTrace({ capture: true })
enableZipkinExport({
  endpoint: 'http://localhost:9411/api/v2/spans',
  serviceName: 'zentrace-demo',
})

enableLokiExport({
  endpoint: 'http://localhost:3100/loki/api/v1/push',
  serviceName: 'zentrace-demo',
  labels: { environment: 'development' },
  authToken: 'Basic bG9raTp0YWJ0ZXN0ZUAwMDY=',
  nestFields: true,
})

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

class AuthService {
  @trace({ name: 'auth', captureArgs: false, captureResult: false })
  async validateToken(token: string, span: Span) {
    span.setAttribute('userId', 'user_123')
    span.console.log('validating token', token)
    await sleep(80)
    span.console.info('token validated', { userId: 'user_123' })
    return { userId: 'user_123', roles: ['USER'] }
  }
}

class PricingService {
  @trace({ name: 'pricing', captureArgs: false, captureResult: false })
  async calculatePrice(orderId: string, span: Span) {
    span.setAttribute('orderId', orderId)
    await sleep(120)
    const base = 100
    const tax = base * 0.23
    const discount = 10
    const total = base + tax - discount
    span.setAttribute('total', total)
    span.console.log('price calculated for', orderId)
    return { orderId, total }
  }
}

class InventoryService {
  @trace({ name: 'inventory', captureArgs: false, captureResult: false })
  async reserveStock(orderId: string, span: Span) {
    span.setAttribute('orderId', orderId)
    span.setAttribute('warehouse', 'EU-WEST-1')
    await sleep(150)
    span.console.info('stock reserved', { orderId, warehouse: 'EU-WEST-1' })
    return { orderId, reserved: true, warehouse: 'EU-WEST-1' }
  }
}

class PaymentService {
  @trace({ name: 'payment', captureArgs: false, captureResult: false })
  async charge(amount: number, userId: string, span: Span) {
    span.setAttribute('amount', amount)
    span.setAttribute('userId', userId)
    const fraud = await this.fraudCheck(userId, span)
    const gateway = await this.processGateway(amount, span)
    span.setAttribute('status', 'success')
    return { status: 'success', fraud, gateway }
  }

  @trace({ name: 'fraud', captureArgs: false })
  async fraudCheck(userId: string, span: Span) {
    span.setAttribute('userId', userId)
    await sleep(60)
    span.setAttribute('risk', 'low')
    return { userId, risk: 'low' }
  }

  @trace({ name: 'gateway', captureArgs: false })
  async processGateway(amount: number, span: Span) {
    span.setAttribute('amount', amount)
    span.setAttribute('provider', 'stripe-mock')
    await sleep(100)
    const transactionId = `tx_${Date.now()}`
    span.setAttribute('transactionId', transactionId)
    return {
      provider: 'stripe-mock',
      amount,
      transactionId,
    }
  }
}

class NotificationService {
  @trace({ name: 'notification' })
  async sendConfirmation(userId: string, span: Span) {
    span.setAttribute('userId', userId)
    span.setAttribute('channel', 'email')
    await sleep(40)
    return { sent: true, channel: 'email', userId }
  }
}

class CheckoutService {
  constructor(
    private auth = new AuthService(),
    private pricing = new PricingService(),
    private inventory = new InventoryService(),
    private payment = new PaymentService(),
    private notification = new NotificationService(),
  ) {}

  @trace({
    name: 'checkout',
    captureArgs: false,
    captureResult: false,
  })
  async runCheckout(orderId: string, span?: Span) {
    const token = 'demo-token'
    console.info('checkout started', orderId)
    span?.setAttribute('orderId', orderId)

    const user = await this.auth.validateToken(token, span!)
    span?.setAttribute('userId', user.userId)

    await fetch('https://jsonplaceholder.typicode.com/todos/1', {
      headers: {
        'x-zentrace-parent-span-id': span!.context.spanId,
      },
    })

    const [price, stock] = await Promise.all([
      this.pricing.calculatePrice(orderId, span!),
      this.inventory.reserveStock(orderId, span!),
    ])

    const payment = await this.payment.charge(price.total, user.userId, span!)
    span?.setAttribute('total', price.total)

    span?.console.log('checkout completed', { orderId, total: price.total })
    void this.notification.sendConfirmation(user.userId, span!)

    return { orderId, user, price, stock, payment }
  }
}

const checkout = new CheckoutService()

/** Call this from a button click — one explicitly linked trace per invocation. */
export function runCheckoutExample(orderId = `order-${Date.now()}`) {
  return checkout.runCheckout(orderId)
}
