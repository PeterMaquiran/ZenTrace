# ZenTrace

Trace function calls, async flow, logs, and HTTP — see it in Chrome DevTools.

[![npm version](https://img.shields.io/npm/v/zentrace.svg)](https://www.npmjs.com/package/zentrace)

![ZenTrace dashboard — span tree, Gantt timeline, and inspector](https://raw.githubusercontent.com/PeterMaquiran/ZenTrace/main/docs/assets/dashboard.png)

## The problem

Async JavaScript is hard to debug. A bug in `checkout()` might come from `validateUser()`, a slow `fetch`, or a `console.log` three layers deep — but the stack trace only shows you where it crashed, not how data flowed to get there.

So you add `console.log`. Then more. You still can't see timing, parent/child calls, or what each function received and returned.

## What ZenTrace gives you

Decorate your functions with `@trace()`. Run your app. Open the **ZenTrace** panel in Chrome DevTools.

Every execution becomes a **trace** you can click through:

|                 |                                                                      |
| --------------- | -------------------------------------------------------------------- |
| **Span tree**   | which function called which — full parent → child hierarchy          |
| **Timeline**    | how long each step took, side by side                                |
| **Inspector**   | arguments, return values, and errors per span                        |
| **Logs + HTTP** | `console.*` and `fetch` calls linked to the span that triggered them |

No external dashboard. No production agent. Built for **local dev** — add a decorator, see your code run.

```bash
npm install zentrace
```

```ts
import { configureZenTrace, enableAutoTracing, trace } from 'zentrace'

configureZenTrace({ testMode: true })
enableAutoTracing({ logs: true, http: true })
```

---

## `@trace()` on class methods

```ts
import { trace, type Span } from 'zentrace'

class UserService {
  @trace({ module: 'users', captureArgs: true, captureResult: true })
  async getUser(id: string, span: Span) {
    const profile = await this.fetchProfile(id, span)
    return this.validate(profile, span)
  }

  @trace({ module: 'users' })
  async fetchProfile(id: string) {
    await sleep(40)
    return { id, name: 'Peter' }
  }

  @trace({ module: 'users' })
  async validate(user: { id: string }) {
    if (!user) throw new Error('Invalid user')
    return user
  }
}
```

```
getUser (120ms)
 ├── fetchProfile (40ms)
 └── validate (80ms)
```

---

## `traceFn()` for standalone functions

```ts
import { traceFn } from 'zentrace'

const getCart = traceFn(
  async (userId: string) => {
    const items = await loadItems(userId)
    return applyDiscount(items)
  },
  { module: 'cart', name: 'getCart', captureArgs: true, captureResult: true },
)

const loadItems = traceFn(
  async (userId: string) => {
    return [{ sku: 'A1', qty: 2 }]
  },
  { module: 'cart', name: 'loadItems' },
)

const applyDiscount = traceFn(
  (items: { sku: string; qty: number }[]) => {
    return { items, total: 42 }
  },
  { module: 'cart', name: 'applyDiscount' },
)
```

```
getCart (95ms)
 ├── loadItems (30ms)
 └── applyDiscount (65ms)
```

---

## Parallel async

```ts
class OrderService {
  @trace({ module: 'orders', captureArgs: true, captureResult: true })
  async createOrder(orderId: string, span: Span) {
    const [price, stock] = await Promise.all([
      this.calculatePrice(orderId, span),
      this.reserveStock(orderId, span),
    ])

    return { orderId, price, stock }
  }

  @trace({ module: 'pricing' })
  async calculatePrice(orderId: string) {
    await sleep(120)
    return { orderId, total: 113 }
  }

  @trace({ module: 'inventory' })
  async reserveStock(orderId: string) {
    await sleep(150)
    return { orderId, reserved: true }
  }
}
```

```
createOrder (150ms)
 ├── calculatePrice (120ms)  ─┐ parallel
 └── reserveStock (150ms)    ─┘
```

---

## Pass the span manually

Add `span` as the last parameter to keep everything in one trace tree.

```ts
import { trace, type Span } from 'zentrace'

class CheckoutService {
  @trace({ module: 'checkout' })
  async run(orderId: string, span?: Span) {
    const user = await this.auth('token', span!)
    const payment = await this.charge(orderId, user.id, span!)
    return { orderId, user, payment }
  }

  @trace({ module: 'auth' })
  async auth(token: string, span?: Span) {
    return { id: 'user_123' }
  }

  @trace({ module: 'payment' })
  async charge(orderId: string, userId: string, span?: Span) {
    return { status: 'ok', orderId, userId }
  }
}
```

```ts
// or link from outside
import { getActiveSpan } from 'zentrace'

const parent = getActiveSpan()
await checkout.run('order-1', parent)
```

---

## Logs + HTTP in the same trace

```ts
import { enableAutoTracing } from 'zentrace'

enableAutoTracing({ logs: true, http: true })
```

```ts
class ApiService {
  @trace({ module: 'api' })
  async loadTodo(span: Span) {
    console.log('fetching todo')

    const res = await fetch('https://api.example.com/todos/1', {
      headers: {
        'x-zentrace-parent-span-id': span.context.spanId,
      },
    })

    console.info('todo loaded', res.status)
    return res.json()
  }
}
```

```
loadTodo (180ms)
 └── HTTP GET api.example.com/todos/1 (140ms)

console.log  → "fetching todo"      (linked to loadTodo)
console.info → "todo loaded 200"    (linked to loadTodo)
```

---

## Global config

```ts
import { configureZenTrace } from 'zentrace'

// dev / test defaults: capture args + results everywhere
configureZenTrace({ testMode: true })

// or set explicitly
configureZenTrace({
  captureArgs: true,
  captureResult: true,
  slowThresholdMs: 100, // highlights slow spans in the UI
})
```

Per-function overrides still win:

```ts
@trace({ captureArgs: false, captureResult: false })
async hashPassword(password: string) {
  return bcrypt.hash(password, 10)
}
```

---

## Sync functions

```ts
import { traceFn } from 'zentrace'

const parseConfig = traceFn((raw: string) => JSON.parse(raw), {
  module: 'config',
  name: 'parseConfig',
  captureArgs: true,
})
```

---

## API

```ts
import {
  trace, // method decorator
  traceFn, // wrap any function
  configureZenTrace,
  enableAutoTracing,
  disableAutoTracing,
  getActiveSpan,
  type Span,
} from 'zentrace'
```
