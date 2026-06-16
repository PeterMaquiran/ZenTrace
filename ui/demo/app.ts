import { configureDevTrace, enableAutoTracing, trace } from '../../src/index'

configureDevTrace({ testMode: true })
enableAutoTracing({ logs: true, http: true })

/**
 * -------------------------
 * Utilities
 * -------------------------
 */

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function randomFail(probability = 0.2) {
  if (Math.random() < probability) {
    throw new Error('Random failure occurred')
  }
}

/**
 * -------------------------
 * Services (ALL IN ONE FILE)
 * -------------------------
 */

class AuthService {
  @trace({ module: 'auth', captureArgs: true, captureResult: true })
  async validateToken(token: string) {
    console.log('validating token', token)
    await sleep(80)
    console.info('token validated', token)
    return {
      userId: 'user_123',
      roles: ['USER'],
    }
  }
}

class PricingService {
  @trace({ module: 'pricing', captureArgs: true, captureResult: true })
  async calculatePrice(orderId: string) {
    await sleep(120)
    console.log('price calculated for', orderId)

    const base = 100
    const tax = base * 0.23
    const discount = 10

    return {
      orderId,
      total: base + tax - discount,
    }
  }
}

class InventoryService {
  @trace({ module: 'inventory', captureArgs: true, captureResult: true })
  async reserveStock(orderId: string) {
    await sleep(150)

    randomFail(0.1)

    return {
      orderId,
      reserved: true,
      warehouse: 'EU-WEST-1',
    }
  }
}

class PaymentService {
  @trace({ module: 'payment', captureArgs: true, captureResult: true })
  async charge(amount: number, userId: string) {
    const fraud = await this.fraudCheck(userId)
    const gateway = await this.processGateway(amount)

    return {
      status: 'success',
      fraud,
      gateway,
    }
  }

  @trace({ module: 'fraud', captureArgs: true })
  async fraudCheck(userId: string) {
    await sleep(60)
    return { userId, risk: 'low' }
  }

  @trace({ module: 'gateway', captureArgs: true })
  async processGateway(amount: number) {
    return this.retry(async () => {
      await sleep(100)
      randomFail(0.3)

      return {
        provider: 'stripe-mock',
        amount,
        transactionId: `tx_${Date.now()}`,
      }
    }, 3)
  }

  private async retry<T>(fn: () => Promise<T>, retries: number): Promise<T> {
    let lastError: unknown

    for (let i = 0; i < retries; i++) {
      try {
        return await fn()
      } catch (err) {
        lastError = err
        await sleep(50 * (i + 1))
      }
    }

    throw lastError
  }
}

class NotificationService {
  @trace({ module: 'notification' })
  async sendConfirmation(userId: string) {
    await sleep(40)
    return {
      sent: true,
      channel: 'email',
      userId,
    }
  }
}

/**
 * -------------------------
 * MAIN ORCHESTRATOR
 * -------------------------
 */

class CheckoutService {
  constructor(
    private auth = new AuthService(),
    private pricing = new PricingService(),
    private inventory = new InventoryService(),
    private payment = new PaymentService(),
    private notification = new NotificationService(),
  ) {}

  @trace({ module: 'checkout', captureArgs: true, captureResult: true })
  async runCheckout(orderId: string) {
    const token = 'demo-token'
    console.info('checkout started', orderId)

    const user = await this.auth.validateToken(token)

    await fetch('https://jsonplaceholder.typicode.com/todos/1')

    const [price, stock] = await Promise.all([
      this.pricing.calculatePrice(orderId),
      this.inventory.reserveStock(orderId),
    ])

    const payment = await this.payment.charge(price.total, user.userId)

    console.log('checkout completed', { orderId, total: price.total })

    void this.notification.sendConfirmation(user.userId)

    return {
      orderId,
      user,
      price,
      stock,
      payment,
    }
  }
}

/**
 * -------------------------
 * UI DEMO
 * -------------------------
 */

const service = new CheckoutService()

const status = document.getElementById('status')
const runButton = document.getElementById('run-checkout')

async function runDemo() {
  if (!runButton || !status) return

  runButton.setAttribute('disabled', 'true')
  status.textContent = 'Running deep traced checkout...'

  try {
    const result = await service.runCheckout(`order-${Date.now()}`)
    status.textContent = `Done: ${JSON.stringify(result, null, 2)}`
  } catch (error) {
    status.textContent = `Failed: ${String(error)}`
  } finally {
    runButton.removeAttribute('disabled')
  }
}

runButton?.addEventListener('click', () => {
  void runDemo()
})

status.textContent =
  'Open Chrome DevTools → DevTrace panel → click Run checkout'
