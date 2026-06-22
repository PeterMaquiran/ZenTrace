import { enableAutoTracing, trace } from '../src/index'

enableAutoTracing({ logs: true, http: true })

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

class CheckoutService {
  @trace({
    module: 'demo',
    captureArgs: true,
    captureResult: true,
  })
  async runCheckout(orderId: string) {
    const user = await this.authenticate('demo-token')
    return this.charge(orderId, user.userId)
  }

  @trace({
    module: 'auth',
    captureArgs: true,
    captureResult: true,
  })
  async authenticate(token: string) {
    await sleep(120)
    console.log('authenticated', token)
    return { userId: 'usr_demo', tokenType: 'Bearer' }
  }

  @trace({
    module: 'payment',
    captureArgs: true,
    captureResult: true,
  })
  async charge(orderId: string, userId: string) {
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
  'Open Chrome DevTools → ZenTrace panel, then click "Run traced checkout".'
