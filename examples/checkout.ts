import { configureZenTrace, enableAutoTracing, Span, trace } from 'zentrace'

configureZenTrace({ testMode: true })
enableAutoTracing({ logs: true, http: true })

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

class AuthService {
  @trace({ module: 'auth', captureArgs: true, captureResult: true })
  async validateToken(token: string, span: Span) {
    span?.console.log('validating token', token)
    await sleep(80)
    span?.console.info('token validated', { userId: 'user_123' })
    return { userId: 'user_123', roles: ['USER'] }
  }
}

class PricingService {
  @trace({ module: 'pricing', captureArgs: true, captureResult: true })
  async calculatePrice(orderId: string, span: Span) {
    await sleep(120)
    span.console.log('price calculated for', orderId)
    const base = 100
    const tax = base * 0.23
    const discount = 10
    return { orderId, total: base + tax - discount }
  }
}

class InventoryService {
  @trace({ module: 'inventory', captureArgs: true, captureResult: true })
  async reserveStock(orderId: string, span: Span) {
    await sleep(150)
    span.console.info('stock reserved', { orderId, warehouse: 'EU-WEST-1' })
    return { orderId, reserved: true, warehouse: 'EU-WEST-1' }
  }
}

class PaymentService {
  @trace({ module: 'payment', captureArgs: true, captureResult: true })
  async charge(amount: number, userId: string, span: Span) {
    const fraud = await this.fraudCheck(userId, span)
    const gateway = await this.processGateway(amount, span)
    return { status: 'success', fraud, gateway }
  }

  @trace({ module: 'fraud', captureArgs: true })
  async fraudCheck(userId: string, span: Span) {
    await sleep(60)
    return { userId, risk: 'low' }
  }

  @trace({ module: 'gateway', captureArgs: true })
  async processGateway(amount: number, span: Span) {
    await sleep(100)
    return {
      provider: 'stripe-mock',
      amount,
      transactionId: `tx_${Date.now()}`,
    }
  }
}

class NotificationService {
  @trace({ module: 'notification' })
  async sendConfirmation(userId: string, span: Span) {
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

  @trace({ module: 'checkout', captureArgs: true, captureResult: true })
  async runCheckout(orderId: string, span?: Span) {
    const token = 'demo-token'
    console.info('checkout started', orderId)

    const user = await this.auth.validateToken(token, span!)

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

    span?.console.log('checkout completed', { orderId, total: price.total })
    void this.notification.sendConfirmation(user.userId, span!)

    return { orderId, user, price, stock, payment }
  }
}

const checkout = new CheckoutService()

/** Call this from a button click — same trace every time you run it. */
export function runCheckoutExample(orderId = `order-${Date.now()}`) {
  return checkout.runCheckout(orderId)
}
