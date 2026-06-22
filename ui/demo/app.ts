import {
  configureDevTrace,
  enableAutoTracing,
  Span,
  trace,
} from '../../src/index'

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
  async validateToken(token: string, span: Span) {
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
  async calculatePrice(orderId: string, span: Span) {
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
  async reserveStock(orderId: string, span: Span) {
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
  async charge(amount: number, userId: string, span: Span) {
    const fraud = await this.fraudCheck(userId, span)
    const gateway = await this.processGateway(amount, span)

    return {
      status: 'success',
      fraud,
      gateway,
    }
  }

  @trace({ module: 'fraud', captureArgs: true })
  async fraudCheck(userId: string, span: Span) {
    await sleep(60)
    return { userId, risk: 'low' }
  }

  @trace({ module: 'gateway', captureArgs: true })
  async processGateway(amount: number, span: Span) {
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
  async sendConfirmation(userId: string, span: Span) {
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
  async runCheckout(orderId: string, span?: Span) {
    const token = 'demo-token'
    console.info('checkout started', orderId)

    const user = await this.auth.validateToken(token, span!)

    await fetch('https://jsonplaceholder.typicode.com/todos/1', {
      headers: {
        'x-devtrace-parent-span-id': span!.context.spanId,
      },
    })

    const [price, stock] = await Promise.all([
      this.pricing.calculatePrice(orderId, span!),
      this.inventory.reserveStock(orderId, span!),
    ])

    const payment = await this.payment.charge(price.total, user.userId, span!)

    console.log('checkout completed', { orderId, total: price.total })

    void this.notification.sendConfirmation(user.userId, span!)

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
/**
 * -------------------------
 * UI DEMO (CONCURRENCY CONFLICT TEST)
 * -------------------------
 */

const service = new CheckoutService()

// Create the UI elements programmatically if they aren't in your HTML
if (!document.getElementById('run-concurrent')) {
  const container =
    document.getElementById('run-checkout')?.parentElement || document.body

  const concurrentBtn = document.createElement('button')
  concurrentBtn.id = 'run-concurrent'
  concurrentBtn.textContent = '⚡ Run 3 Concurrent Checkouts'
  concurrentBtn.style.marginLeft = '10px'
  concurrentBtn.style.padding = '8px 12px'
  concurrentBtn.style.background = '#e67e22'
  concurrentBtn.style.color = 'white'
  concurrentBtn.style.border = 'none'
  concurrentBtn.style.borderRadius = '4px'
  concurrentBtn.style.cursor = 'pointer'

  container.appendChild(concurrentBtn)
}

const status = document.getElementById('status')
const runButton = document.getElementById('run-checkout')
const concurrentButton = document.getElementById('run-concurrent')

// Standard Single Run
async function runDemo() {
  if (!runButton || !status) return
  runButton.setAttribute('disabled', 'true')
  status.textContent = 'Running single traced checkout...'

  try {
    const result = await service.runCheckout(`order-single-${Date.now()}`)
    status.textContent = `Done: ${JSON.stringify(result, null, 2)}`
  } catch (error) {
    status.textContent = `Failed: ${String(error)}`
  } finally {
    runButton.removeAttribute('disabled')
  }
}

// CONCURRENT BURST TEST
async function runConcurrentTest() {
  if (!concurrentButton || !status) return
  concurrentButton.setAttribute('disabled', 'true')
  status.textContent = '🔥 Blasting 3 concurrent checkouts simultaneously...'

  const startTime = Date.now()

  try {
    // Fire 3 checkouts at the exact same time
    const promises = [
      service.runCheckout(`CONCURRENT-A-${startTime}`),
      service.runCheckout(`CONCURRENT-B-${startTime}`),
      service.runCheckout(`CONCURRENT-C-${startTime}`),
    ]

    const results = await Promise.allSettled(promises)

    status.textContent =
      `Finished Concurrency Test. Results:\n` +
      results.map((r, i) => `Job ${i + 1}: ${r.status}`).join('\n') +
      `\n\nCheck DevTools to see if trace IDs or parent spans crossed wires!`
  } catch (error) {
    status.textContent = `Orchestrator exploded: ${String(error)}`
  } finally {
    concurrentButton.removeAttribute('disabled')
  }
}

runButton?.addEventListener('click', () => void runDemo())
concurrentButton?.addEventListener('click', () => void runConcurrentTest())

if (status) {
  status.style.whiteSpace = 'pre-wrap'
  status.textContent =
    'Open Chrome DevTools → DevTrace panel → click "Run 3 Concurrent Checkouts"'
}
