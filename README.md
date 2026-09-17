# ZenTrace

Trace function calls, async flow, logs, and HTTP — see it in Chrome DevTools.

[npm version](https://www.npmjs.com/package/zentrace)

## The problem

Async JavaScript is hard to debug. A bug in `checkout()` might come from `validateUser()`, a slow `fetch`, or a `console.log` three layers deep — but the stack trace only shows you where it crashed, not how data flowed to get there.

## What ZenTrace gives you

Decorate your functions with `@trace()`. Run your app. Open the **ZenTrace** panel in Chrome DevTools.

|                 |                                               |
| --------------- | --------------------------------------------- |
| **Span tree**   | which function called which                   |
| **Timeline**    | how long each step took                       |
| **Inspector**   | arguments, return values, `setAttribute` tags |
| **Logs + HTTP** | `console.`\* and `fetch` linked to spans      |

```bash
npm install zentrace
```

## Structured logging

`setLogger` routes `span.console.*` through Pino, Winston, or another structured
logger using Pino's `(bindings, message)` call shape. Object arguments stay as
JSON fields — they are never stringified into `message`.

```ts
import pino from 'pino'
import { setLogger } from 'zentrace'

const p = pino()

setLogger({
  info: p.info.bind(p),
  error: p.error.bind(p),
  debug: p.debug.bind(p),
  warn: p.warn.bind(p),
})

// span.console.log('checkout completed', { orderId, total })
// → p.info({ orderId, total, correlationId, traceId, spanId, ... }, 'checkout completed')
```

Winston needs a thin adapter because its argument order is `(message, meta)`:

```ts
import winston from 'winston'
import { setLogger } from 'zentrace'

const logger = winston.createLogger({
  transports: [new winston.transports.Console()],
})

setLogger({
  info: (bindings, message) =>
    typeof bindings === 'string'
      ? logger.info(bindings)
      : logger.info(message ?? '', bindings),
  error: (bindings, message) =>
    typeof bindings === 'string'
      ? logger.error(bindings)
      : logger.error(message ?? '', bindings),
  debug: (bindings, message) =>
    typeof bindings === 'string'
      ? logger.debug(bindings)
      : logger.debug(message ?? '', bindings),
})
```

## Export to Zipkin and Loki

Call these once at process startup — typically next to `configureZenTrace()`.
[examples/checkout.ts](examples/checkout.ts) shows the full setup.
Fetch is traced automatically when a `@trace` / `traceFn` span starts.

```ts
import { enableZipkinExport } from 'zentrace/exporters/zipkin'
import { enableLokiExport } from 'zentrace/exporters/loki'

enableZipkinExport({
  endpoint: 'http://localhost:9411/api/v2/spans',
  serviceName: 'checkout-api',
})

enableLokiExport({
  endpoint: 'http://localhost:3100/loki/api/v1/push',
  serviceName: 'checkout-api',
  labels: { environment: 'development' },
  nestFields: true,
})
```

Defaults are local Zipkin (`9411`) and Loki (`3100`) if you omit `endpoint`.
A second call with the same exporter **replaces** the previous one. Use
`disableZipkinExport()` / `disableLokiExport()` to stop sending.

| Option        | Zipkin | Loki | Notes                                                               |
| ------------- | ------ | ---- | ------------------------------------------------------------------- |
| `endpoint`    | ✓      | ✓    | HTTP POST destination                                               |
| `serviceName` | ✓      | ✓    | Zipkin `localEndpoint`; Loki `service_name` label                   |
| `authToken`   | ✓      | ✓    | Full `Authorization` value, e.g. `Bearer ${process.env.TOKEN}`      |
| `headers`     | ✓      | ✓    | Extra request headers                                               |
| `labels`      |        | ✓    | Low-cardinality stream labels only (`environment`, `cluster`, …)    |
| `tenantId`    |        | ✓    | Grafana Cloud / multi-tenant Loki (`X-Scope-OrgID`)                 |
| `nestFields`  |        | ✓    | Put dynamic payload under `fields` (Grafana JSON is easier to scan) |

Zipkin receives one v2 span per finished function. It never sends
`zentrace.logs`, captured `input` / `output` from `captureArgs` /
`captureResult`, or the auto-traced `HTTP <method>` spans. Those stay in Loki
and DevTools.

Use **`span.setAttribute()`** for values you want on the span itself — Zipkin
tags, inspector fields, and filters. Prefer that over stuffing IDs into
`console.log` objects. Tag each hop (`orderId`, `userId`, `amount`, …), not
only the root.

```ts
enableZipkinExport({
  endpoint: 'http://localhost:9411/api/v2/spans',
  serviceName: 'checkout-api',
})

class CheckoutService {
  @trace({ name: 'checkout' })
  async runCheckout(orderId: string, span?: Span) {
    span?.setAttribute('orderId', orderId)
    const user = await this.auth.validateToken(token, span!)
    span?.setAttribute('userId', user.userId)
    const price = await this.pricing.calculatePrice(orderId, span!)
    span?.setAttribute('total', price.total)
  }
}

class PricingService {
  @trace({ name: 'pricing' })
  async calculatePrice(orderId: string, span: Span) {
    span.setAttribute('orderId', orderId)
    const total = 113
    span.setAttribute('total', total)
    return { orderId, total }
  }
}
```

`setAttribute('input', …)` / `setAttribute('output', …)` is the only way those
keys reach Zipkin — captured decorator I/O does not.

Loki receives `span.console.*` lines plus, when `captureArgs` /
`captureResult` are on, a structured `event: "span"` line with parsed
`input` / `output`.

Log JSON uses OpenTelemetry-style `trace_id`, `span_id`, `parent_span_id`, and
`span_name`. Configure a Grafana Loki derived field on `trace_id` that links
to your Zipkin data source. Do not put trace IDs in Loki `labels` — that
creates a high-cardinality stream per trace.

## Example: checkout flow

Copy [examples/checkout.ts](examples/checkout.ts) → call `runCheckoutExample()`.
The file also enables Zipkin + Loki export (see above). Tag each span with
`setAttribute` so Zipkin and the inspector show `orderId`, `userId`, amounts,
and status — not only the root checkout span.

```ts
import { Span, trace } from 'zentrace'

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

class AuthService {
  @trace({ name: 'auth', captureArgs: true, captureResult: true })
  async validateToken(token: string, span: Span) {
    span.setAttribute('userId', 'user_123')
    span.console.log('validating token', token)
    await sleep(80)
    span.console.info('token validated', { userId: 'user_123' })
    return { userId: 'user_123', roles: ['USER'] }
  }
}

class PricingService {
  @trace({ name: 'pricing', captureArgs: true, captureResult: true })
  async calculatePrice(orderId: string, span: Span) {
    span.setAttribute('orderId', orderId)
    await sleep(120)
    const total = 100 * 1.23 - 10
    span.setAttribute('total', total)
    span.console.log('price calculated for', orderId)
    return { orderId, total }
  }
}

class InventoryService {
  @trace({ name: 'inventory', captureArgs: true, captureResult: true })
  async reserveStock(orderId: string, span: Span) {
    span.setAttribute('orderId', orderId)
    span.setAttribute('warehouse', 'EU-WEST-1')
    await sleep(150)
    span.console.info('stock reserved', { orderId, warehouse: 'EU-WEST-1' })
    return { orderId, reserved: true, warehouse: 'EU-WEST-1' }
  }
}

class PaymentService {
  @trace({ name: 'payment', captureArgs: true, captureResult: true })
  async charge(amount: number, userId: string, span: Span) {
    span.setAttribute('amount', amount)
    span.setAttribute('userId', userId)
    const fraud = await this.fraudCheck(userId, span)
    const gateway = await this.processGateway(amount, span)
    span.setAttribute('status', 'success')
    return { status: 'success', fraud, gateway }
  }

  @trace({ name: 'fraud', captureArgs: true })
  async fraudCheck(userId: string, span: Span) {
    span.setAttribute('userId', userId)
    await sleep(60)
    span.setAttribute('risk', 'low')
    return { userId, risk: 'low' }
  }

  @trace({ name: 'gateway', captureArgs: true })
  async processGateway(amount: number, span: Span) {
    span.setAttribute('amount', amount)
    span.setAttribute('provider', 'stripe-mock')
    await sleep(100)
    const transactionId = `tx_${Date.now()}`
    span.setAttribute('transactionId', transactionId)
    return { provider: 'stripe-mock', amount, transactionId }
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
    captureArgs: true,
    captureResult: true,
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
```

![Description](https://drive.google.com/uc?export=view&id=1x1TG4S1Wk5ixGI8cPklvgaSHq84x4bec)

---

## Example: parallel async

Copy [examples/parallel-order.ts](examples/parallel-order.ts) → call `runParallelOrderExample()`.

```ts
import { Span, trace } from 'zentrace'

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

class OrderService {
  @trace({ name: 'orders', captureArgs: true, captureResult: true })
  async createOrder(orderId: string, span?: Span) {
    span?.setAttribute('orderId', orderId)
    span?.console.info('creating order', orderId)

    const [price, stock, shipping] = await Promise.all([
      this.calculatePrice(orderId, span!),
      this.reserveStock(orderId, span!),
      this.estimateShipping(orderId, span!),
    ])

    span?.setAttribute('total', price.total)
    span?.console.log('order assembled', { orderId, total: price.total })
    return { orderId, price, stock, shipping }
  }

  @trace({ name: 'pricing', captureArgs: true, captureResult: true })
  async calculatePrice(orderId: string, span: Span) {
    span.setAttribute('orderId', orderId)
    await sleep(120)
    const priced = { orderId, subtotal: 89.99, tax: 12.35, total: 102.34 }
    span.setAttribute('total', priced.total)
    return priced
  }

  @trace({ name: 'inventory', captureArgs: true, captureResult: true })
  async reserveStock(orderId: string, span: Span) {
    span.setAttribute('orderId', orderId)
    span.setAttribute('sku', 'SKU-4421')
    span.setAttribute('warehouse', 'US-EAST-2')
    await sleep(150)
    return { orderId, sku: 'SKU-4421', qty: 2, warehouse: 'US-EAST-2' }
  }

  @trace({ name: 'shipping', captureArgs: true, captureResult: true })
  async estimateShipping(orderId: string, span: Span) {
    span.setAttribute('orderId', orderId)
    span.setAttribute('carrier', 'fedex')
    await sleep(90)
    return { orderId, carrier: 'fedex', days: 3, cost: 9.5 }
  }
}

const orders = new OrderService()

export function runParallelOrderExample(
  baseOrderId = `order-parallel-${Date.now()}`,
) {
  return Promise.all([
    orders.createOrder(`${baseOrderId}-A`),
    orders.createOrder(`${baseOrderId}-B`),
  ])
}
```

![Description](https://drive.google.com/uc?export=view&id=13osbG0355Nd4wayC8o_r6lmKpjpR_S9D)

---

## Example: errors + retry

Copy [examples/error-retry.ts](examples/error-retry.ts) → call `runErrorRetryExample()`. Use the **Errors** filter in the toolbar.

`examples/error-retry.ts` — click to expand

```ts
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
```

![Description](https://drive.google.com/uc?export=view&id=1VTWLV1tlNqmmCKGtWuKlJHlqtN2Kzugi)

---

## Example: `traceFn()`

Copy [examples/trace-fn-cart.ts](examples/trace-fn-cart.ts) → call`runTraceFnCartExample()`.

```ts
import { Span, traceFn } from 'zentrace'

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const loadItems = traceFn(
  async (userId: string, span?: Span) => {
    span?.setAttribute('userId', userId)
    await sleep(45)
    span?.console.log('loaded cart items', userId)
    return [
      { sku: 'BOOK-01', title: 'ZenTrace Guide', qty: 1, price: 29 },
      { sku: 'MUG-02', title: 'Dev Mug', qty: 2, price: 12 },
    ]
  },
  {
    name: 'loadItems',
    captureArgs: true,
    captureResult: true,
  },
)

const applyCoupon = traceFn(
  async (items: { sku: string; price: number; qty: number }[], span?: Span) => {
    await sleep(35)
    const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0)
    const total = subtotal - 10
    span?.setAttribute('itemCount', items.length)
    span?.setAttribute('subtotal', subtotal)
    span?.setAttribute('total', total)
    return { items, subtotal, discount: 10, total }
  },
  {
    name: 'applyCoupon',
    captureArgs: true,
    captureResult: true,
  },
)

const finalizeCart = traceFn(
  async (userId: string, span?: Span) => {
    span?.setAttribute('userId', userId)
    const items = await loadItems(userId, span)
    const priced = await applyCoupon(items, span)
    span?.setAttribute('total', priced.total)
    span?.console.info('cart ready', { userId, total: priced.total })
    return priced
  },
  {
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
- **Custom Attributes:** Key-value pairs from `span.setAttribute()`. Tag IDs
  and outcomes (`orderId`, `userId`, `total`) so they show here and in Zipkin.
  `@trace({ name })` only sets the span name.

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

| File                                                                 | Run function                      | What you see                             |
| -------------------------------------------------------------------- | --------------------------------- | ---------------------------------------- |
| [examples/checkout.ts](examples/checkout.ts)                         | `runCheckoutExample()`            | Deep tree, HTTP, parallel branches, logs |
| [examples/parallel-order.ts](examples/parallel-order.ts)             | `runParallelOrderExample()`       | Three sibling spans on timeline          |
| [examples/error-retry.ts](examples/error-retry.ts)                   | `runErrorRetryExample()`          | Failed attempts, retries, error logs     |
| [examples/trace-fn-cart.ts](examples/trace-fn-cart.ts)               | `runTraceFnCartExample()`         | `traceFn()` without classes              |
| [examples/concurrent-checkouts.ts](examples/concurrent-checkouts.ts) | `runConcurrentCheckoutsExample()` | Three separate root traces               |

---

## API

```ts
import { trace, traceFn, type Span } from 'zentrace'
import { enableZipkinExport } from 'zentrace/exporters/zipkin'
import { enableLokiExport } from 'zentrace/exporters/loki'

@trace({ name: 'checkout' }) // span name; defaults to the method name
traceFn(fn, { name: 'loadItems' })
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
