import { configureZenTrace, enableAutoTracing, Span, traceFn } from 'zentrace'

configureZenTrace({ testMode: true })
enableAutoTracing({ logs: true, http: true })

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const loadItems = traceFn(
  async (userId: string, span?: Span) => {
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
  async (items: { sku: string; price: number; qty: number }[], span?: Span) => {
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
  async (userId: string, span?: Span) => {
    const items = await loadItems(userId, span)
    const priced = await applyCoupon(items, span)
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
