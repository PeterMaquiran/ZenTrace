import type { Span } from '../src/core/span'
import { trace } from '../src/decorator/index'
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

class CheckoutService {
  @trace({
    module: 'demo',
    captureArgs: true,
    captureResult: true,
  })
  async runCheckout(orderId: string, ...args: unknown[]) {
    const parentSpan = args[args.length - 1] as Span
    const user = await this.authenticate('demo-token', parentSpan)
    return this.charge(orderId, user.userId, parentSpan)
  }

  @trace({
    module: 'auth',
    captureArgs: true,
    captureResult: true,
  })
  async authenticate(token: string, parentSpan?: Span) {
    void parentSpan
    await sleep(120)
    return { userId: 'usr_demo', tokenType: 'Bearer' }
  }

  @trace({
    module: 'payment',
    captureArgs: true,
    captureResult: true,
  })
  async charge(orderId: string, userId: string, parentSpan?: Span) {
    void parentSpan
    await sleep(180)
    return {
      orderId,
      userId,
      status: 'succeeded',
      chargeId: `ch_${Date.now()}`,
    }
  }
}

const service = new CheckoutService()
const status = document.getElementById('status')
const runButton = document.getElementById('run-checkout')

async function runDemo() {
  if (!runButton || !status) return

  runButton.setAttribute('disabled', 'true')
  status.textContent = 'Running traced checkout...'

  try {
    const result = await service.runCheckout(`order-${Date.now()}`)
    status.textContent = `Done: ${JSON.stringify(result)}`
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
  'Open Chrome DevTools → DevTrace panel, then click "Run traced checkout".'
