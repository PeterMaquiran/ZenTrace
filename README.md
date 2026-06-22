# ZenTrace

Trace function calls, async flow, logs, and HTTP — see it in Chrome DevTools.

[![npm version](https://img.shields.io/npm/v/zentrace.svg)](https://www.npmjs.com/package/zentrace)

## The problem

Async JavaScript is hard to debug. A bug in `checkout()` might come from `validateUser()`, a slow `fetch`, or a `console.log` three layers deep — but the stack trace only shows you where it crashed, not how data flowed to get there.

## What ZenTrace gives you

Decorate your functions with `@trace()`. Run your app. Open the **ZenTrace** panel in Chrome DevTools.

|                 |                                         |
| --------------- | --------------------------------------- |
| **Span tree**   | which function called which             |
| **Timeline**    | how long each step took                 |
| **Inspector**   | arguments, return values, errors        |
| **Logs + HTTP** | `console.*` and `fetch` linked to spans |

```bash
npm install zentrace
```

### Run any example

1. Load the [ZenTrace Chrome extension](https://github.com/PeterMaquiran/ZenTrace) (`extension/` → Load unpacked)
2. Copy one of the files below into your app (e.g. `checkout.ts`)
3. Wire the exported `run*Example()` to a button and open DevTools → **ZenTrace**

```html
<button id="run">Run traced checkout</button>
<script type="module">
  import { runCheckoutExample } from './checkout.ts'

  document.getElementById('run')?.addEventListener('click', () => {
    void runCheckoutExample()
  })
</script>
```

> **TypeScript:** enable `"experimentalDecorators": true` in `tsconfig.json`.

Or try them all: `pnpm dev:demo`

---

## Example: checkout flow

Copy [`examples/checkout.ts`](examples/checkout.ts) → call `runCheckoutExample()`.

![Checkout trace — span tree, timeline, and inspector](docs/assets/example-checkout.png)

<details>
<summary><code>examples/checkout.ts</code> — click to expand</summary>

```ts
import { configureZenTrace, enableAutoTracing, Span, trace } from 'zentrace'

configureZenTrace({ testMode: true })
enableAutoTracing({ logs: true, http: true })

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

class AuthService {
  @trace({ module: 'auth', captureArgs: true, captureResult: true })
  async validateToken(token: string, span: Span) {
    console.log('validating token', token)
    await sleep(80)
    console.info('token validated', { userId: 'user_123' })
    return { userId: 'user_123', roles: ['USER'] }
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
    return { orderId, total: base + tax - discount }
  }
}

class InventoryService {
  @trace({ module: 'inventory', captureArgs: true, captureResult: true })
  async reserveStock(orderId: string, span: Span) {
    await sleep(150)
    console.info('stock reserved', { orderId, warehouse: 'EU-WEST-1' })
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

    console.log('checkout completed', { orderId, total: price.total })
    void this.notification.sendConfirmation(user.userId, span!)

    return { orderId, user, price, stock, payment }
  }
}

const checkout = new CheckoutService()

export function runCheckoutExample(orderId = `order-${Date.now()}`) {
  return checkout.runCheckout(orderId)
}
```

</details>

```
runCheckout (~550ms)
 ├── validateToken (80ms)
 ├── HTTP GET jsonplaceholder…/todos/1
 ├── calculatePrice (120ms)  ─┐ parallel
 ├── reserveStock (150ms)    ─┘
 └── charge (160ms)
      ├── fraudCheck (60ms)
      └── processGateway (100ms)
```

---

## Example: parallel async

Copy [`examples/parallel-order.ts`](examples/parallel-order.ts) → call `runParallelOrderExample()`.

![Parallel order trace — sibling spans on the timeline](docs/assets/example-parallel.png)

<details>
<summary><code>examples/parallel-order.ts</code> — click to expand</summary>

```ts
import { configureZenTrace, enableAutoTracing, Span, trace } from 'zentrace'

configureZenTrace({ testMode: true })
enableAutoTracing({ logs: true, http: true })

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

class OrderService {
  @trace({ module: 'orders', captureArgs: true, captureResult: true })
  async createOrder(orderId: string, span?: Span) {
    console.info('creating order', orderId)

    const [price, stock, shipping] = await Promise.all([
      this.calculatePrice(orderId, span!),
      this.reserveStock(orderId, span!),
      this.estimateShipping(orderId, span!),
    ])

    console.log('order assembled', { orderId, total: price.total })
    return { orderId, price, stock, shipping }
  }

  @trace({ module: 'pricing', captureArgs: true, captureResult: true })
  async calculatePrice(orderId: string, span: Span) {
    await sleep(120)
    return { orderId, subtotal: 89.99, tax: 12.35, total: 102.34 }
  }

  @trace({ module: 'inventory', captureArgs: true, captureResult: true })
  async reserveStock(orderId: string, span: Span) {
    await sleep(150)
    return { orderId, sku: 'SKU-4421', qty: 2, warehouse: 'US-EAST-2' }
  }

  @trace({ module: 'shipping', captureArgs: true, captureResult: true })
  async estimateShipping(orderId: string, span: Span) {
    await sleep(90)
    return { orderId, carrier: 'fedex', days: 3, cost: 9.5 }
  }
}

const orders = new OrderService()

export function runParallelOrderExample(
  orderId = `order-parallel-${Date.now()}`,
) {
  return orders.createOrder(orderId)
}
```

</details>

---

## Example: errors + retry

Copy [`examples/error-retry.ts`](examples/error-retry.ts) → call `runErrorRetryExample()`. Use the **Errors** filter in the toolbar.

![Error retry trace — failed spans and recovery](docs/assets/example-error-retry.png)

<details>
<summary><code>examples/error-retry.ts</code> — click to expand</summary>

```ts
import { configureZenTrace, enableAutoTracing, Span, trace } from 'zentrace'

configureZenTrace({ testMode: true })
enableAutoTracing({ logs: true, http: true })

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

class PaymentGateway {
  private attempts = 0

  @trace({ module: 'gateway', captureArgs: true, captureResult: true })
  async charge(amount: number, span: Span) {
    return this.retryWithBackoff(() => this.callProvider(amount, span), 3, span)
  }

  @trace({ module: 'gateway', captureArgs: true })
  async callProvider(amount: number, span: Span) {
    this.attempts += 1
    await sleep(70)
    console.warn('gateway attempt', this.attempts)

    if (this.attempts < 3) {
      throw new Error(`Gateway timeout (attempt ${this.attempts})`)
    }

    console.info('gateway charge succeeded', { amount })
    return { provider: 'stripe-mock', amount, chargeId: `ch_${Date.now()}` }
  }

  @trace({ module: 'gateway', captureArgs: true })
  async retryWithBackoff<T>(
    fn: () => Promise<T>,
    retries: number,
    span: Span,
  ): Promise<T> {
    let lastError: unknown

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error
        console.error('charge failed, retrying', {
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

  @trace({ module: 'billing', captureArgs: true, captureResult: true })
  async processInvoice(invoiceId: string, span?: Span) {
    console.info('processing invoice', invoiceId)
    const charge = await this.gateway.charge(149.99, span!)
    return { invoiceId, status: 'paid', charge }
  }
}

export function runErrorRetryExample(invoiceId = `inv-${Date.now()}`) {
  const billing = new BillingService(new PaymentGateway())
  return billing.processInvoice(invoiceId)
}
```

</details>

---

## Example: `traceFn()`

Copy [`examples/trace-fn-cart.ts`](examples/trace-fn-cart.ts) → call `runTraceFnCartExample()`.

<details>
<summary><code>examples/trace-fn-cart.ts</code> — click to expand</summary>

```ts
import { configureZenTrace, enableAutoTracing, traceFn } from 'zentrace'

configureZenTrace({ testMode: true })
enableAutoTracing({ logs: true, http: true })

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const loadItems = traceFn(
  async (userId: string) => {
    await sleep(45)
    console.log('loaded cart items', userId)
    return [
      { sku: 'BOOK-01', title: 'ZenTrace Guide', qty: 1, price: 29 },
      { sku: 'MUG-02', title: 'Dev Mug', qty: 2, price: 12 },
    ]
  },
  {
    module: 'cart',
    name: 'loadItems',
    captureArgs: true,
    captureResult: true,
  },
)

const applyCoupon = traceFn(
  async (items: { sku: string; price: number; qty: number }[]) => {
    await sleep(35)
    const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0)
    return { items, subtotal, discount: 10, total: subtotal - 10 }
  },
  {
    module: 'cart',
    name: 'applyCoupon',
    captureArgs: true,
    captureResult: true,
  },
)

const finalizeCart = traceFn(
  async (userId: string) => {
    const items = await loadItems(userId)
    const priced = await applyCoupon(items)
    console.info('cart ready', { userId, total: priced.total })
    return priced
  },
  {
    module: 'cart',
    name: 'finalizeCart',
    captureArgs: true,
    captureResult: true,
  },
)

export function runTraceFnCartExample(userId = `user-${Date.now()}`) {
  return finalizeCart(userId)
}
```

</details>

---

## All examples

| File                                                                   | Run function                      | What you see                             |
| ---------------------------------------------------------------------- | --------------------------------- | ---------------------------------------- |
| [`examples/checkout.ts`](examples/checkout.ts)                         | `runCheckoutExample()`            | Deep tree, HTTP, parallel branches, logs |
| [`examples/parallel-order.ts`](examples/parallel-order.ts)             | `runParallelOrderExample()`       | Three sibling spans on timeline          |
| [`examples/error-retry.ts`](examples/error-retry.ts)                   | `runErrorRetryExample()`          | Failed attempts, retries, error logs     |
| [`examples/trace-fn-cart.ts`](examples/trace-fn-cart.ts)               | `runTraceFnCartExample()`         | `traceFn()` without classes              |
| [`examples/concurrent-checkouts.ts`](examples/concurrent-checkouts.ts) | `runConcurrentCheckoutsExample()` | Three separate root traces               |

---

## API

```ts
import {
  trace,
  traceFn,
  configureZenTrace,
  enableAutoTracing,
  disableAutoTracing,
  getActiveSpan,
  type Span,
} from 'zentrace'
```
