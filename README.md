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

## Example: checkout flow

Copy [`examples/checkout.ts`](examples/checkout.ts) → call `runCheckoutExample()`.

```ts
import { Span, trace } from 'zentrace'

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

![Description](https://drive.google.com/uc?export=view&id=1x1TG4S1Wk5ixGI8cPklvgaSHq84x4bec)

---

## Example: parallel async

Copy [`examples/parallel-order.ts`](examples/parallel-order.ts) → call `runParallelOrderExample()`.

```ts
import { Span, trace } from 'zentrace'

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

![Description](https://drive.google.com/uc?export=view&id=13osbG0355Nd4wayC8o_r6lmKpjpR_S9D)

---

## Example: errors + retry

Copy [`examples/error-retry.ts`](examples/error-retry.ts) → call `runErrorRetryExample()`. Use the **Errors** filter in the toolbar.

<summary><code>examples/error-retry.ts</code> — click to expand</summary>

```ts
import { Span, trace } from 'zentrace'

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

![Description](https://drive.google.com/uc?export=view&id=1VTWLV1tlNqmmCKGtWuKlJHlqtN2Kzugi)

---

## Example: `traceFn()`

Copy [`examples/trace-fn-cart.ts`](examples/trace-fn-cart.ts) → call `runTraceFnCartExample()`.

```ts
import { traceFn } from 'zentrace'

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

![Description](https://drive.google.com/uc?export=view&id=1hkceMZbWrFLhelLjIejqmskw_RF9hO1r)

---

## The Inspector Side Panel

When you select any span in the **Span Tree** or **Timeline**, the right-hand side panel opens to provide a deep-dive breakdown of the span's metadata, payload, and lifecycle.

### 1. Execution Overview & Custom Attributes

Displays the core tracing metadata and any custom tags/attributes associated with the span:

- **Timing Metadata:** Tracks the `Start Offset` (when the span started relative to the root trace) and the `Total Duration`.
- **Share of Trace:** The percentage of the total trace execution time spent inside this span.
- **Custom Attributes:** Displays key-value pairs like `Module` and `Hierarchy Depth` configured via your trace decorators.

### 2. Input Arguments & Output Results

When `captureArgs` or `captureResult` are enabled, the payload is serialized directly into the span attributes:

- **Input Arguments:** An expandable JSON block showing the exact runtime parameters passed to the function.
- **Output Result:** The resolved payload (or error object) captured when the span closed.

### 3. Lifecycle Events

Following standard distributed tracing patterns (akin to Zipkin annotations), this section displays timestamped events and logs tied to the span's lifecycle, allowing you to track exactly _when_ internal state changes or log statements occurred during the span's execution.

![Description](https://drive.google.com/uc?export=view&id=1bNiIu-HQOwClUiHdNNtRsUOVGofBmhiU)

---

## Chrome Extension

This repository includes a Chrome DevTools extension.

The extension source code is located in the extension/ folder at the root of the repository.

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top right corner).
3. Click **Load unpacked** in the top left.
4. Select the `extension/` folder from this repository.

Select the extension/ folder from this repository
Once installed, you’ll see the ZenTrace panel inside Chrome DevTools.

**Make sure to build the extension first**

```ts
pnpm build:extension
```

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
import { trace, traceFn, type Span } from 'zentrace'
```

---

## Contributing

Contributions are welcome — bug reports, docs, examples, and code.

| Resource           | Link                                       |
| ------------------ | ------------------------------------------ |
| Contributing guide | [CONTRIBUTING.md](./CONTRIBUTING.md)       |
| Code of conduct    | [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) |
| Security policy    | [SECURITY.md](./SECURITY.md)               |
| License            | [MIT](./LICENSE)                           |

Open an issue using the bug or feature templates, or submit a pull request.
