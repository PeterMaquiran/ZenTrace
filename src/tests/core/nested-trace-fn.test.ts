import { describe, it, expect, beforeEach } from 'vitest'

import { traceFn } from '../../decorator/function'
import { SpanStorage } from '../../storage/memory-storage'

describe('nested traceFn propagation', () => {
  beforeEach(() => {
    SpanStorage.clear()
  })

  it('links nested traceFn calls when outer callback is anonymous', async () => {
    async function removeState(versionId: string, stateId: string) {
      return { versionId, stateId }
    }

    const onBeforeDelete = traceFn(async ({ ids }: { ids: string[] }, span) => {
      span?.addAttribute('operation', 'onBeforeDelete')

      for (const id of ids) {
        await traceFn(removeState, span)('v1', id)
      }
      return true
    })

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
})
