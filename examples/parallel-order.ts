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
