import { describe, it, expect, beforeEach } from 'vitest'

import { traceFn } from '../../runtime/decorator/function'
import { SpanStorage } from '../../storage/memory-storage'

import type { Span } from '@/index'

describe('nested traceFn propagation', () => {
  beforeEach(() => {
    SpanStorage.clear()
  })

  it('links nested traceFn calls when parent span is passed explicitly', async () => {
    async function removeState(versionId: string, stateId: string) {
      return { versionId, stateId }
    }

    const onBeforeDelete = traceFn(
      async ({ ids }: { ids: string[] }, span: Span) => {
        span?.addAttribute('operation', 'onBeforeDelete')

        for (const id of ids) {
          await traceFn(removeState, span)('v1', id)
        }
        return true
      },
    )

    await onBeforeDelete({ ids: ['a', 'b'] })

    const spans = SpanStorage.getAll()
    expect(spans.length).toBe(3)

    const parent = spans.find(
      (span) => span.attributes['operation'] === 'onBeforeDelete',
    )
    const children = spans.filter((span) => span.name === 'removeState')

    expect(parent).toBeDefined()
    expect(children.length).toBe(2)

    for (const child of children) {
      expect(child.context.parentId).toBe(parent?.context.spanId)
      expect(child.context.traceId).toBe(parent?.context.traceId)
    }
  })

  it('creates one root span and two children when parent span is forwarded (cart pattern)', async () => {
    const loadItems = traceFn(
      async (userId: string, span?: Span) => {
        void span
        return [{ sku: 'BOOK-01', price: 29, qty: 1 }]
      },
      { name: 'loadItems' },
    )

    const applyCoupon = traceFn(
      async (
        items: { sku: string; price: number; qty: number }[],
        span?: Span,
      ) => {
        void span
        const subtotal = items.reduce(
          (sum, item) => sum + item.price * item.qty,
          0,
        )
        return { items, subtotal, discount: 10, total: subtotal - 10 }
      },
      { name: 'applyCoupon' },
    )

    const finalizeCart = traceFn(
      async (userId: string, span?: Span) => {
        const items = await loadItems(userId, span)
        return applyCoupon(items, span)
      },
      { name: 'finalizeCart' },
    )

    await finalizeCart('user-1')

    const spans = SpanStorage.getAll()
    expect(spans.length).toBe(3)

    const root = spans.find((span) => span.name === 'finalizeCart')
    const loadItemsSpan = spans.find((span) => span.name === 'loadItems')
    const applyCouponSpan = spans.find((span) => span.name === 'applyCoupon')

    expect(root).toBeDefined()
    expect(root?.context.parentId).toBeNull()
    expect(loadItemsSpan).toBeDefined()
    expect(applyCouponSpan).toBeDefined()

    for (const child of [loadItemsSpan, applyCouponSpan]) {
      expect(child?.context.parentId).toBe(root?.context.spanId)
      expect(child?.context.traceId).toBe(root?.context.traceId)
    }
  })
})
