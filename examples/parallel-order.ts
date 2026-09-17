import { configureZenTrace, Span, trace } from 'zentrace'

configureZenTrace({ capture: true })

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
