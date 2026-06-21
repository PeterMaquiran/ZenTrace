import { describe, it, expect, beforeEach } from 'vitest'

import { traceFn } from '../../decorator/function'
import { SpanStorage } from '../../storage/memory-storage'

import type { Span } from '@/index'

describe('traceFn', () => {
  beforeEach(() => {
    SpanStorage.clear()
  })

  it('traces synchronous functions and returns the result directly', () => {
    function sum(a: number, b: number) {
      return a + b
    }

    expect(traceFn(sum)(2, 3)).toBe(5)

    const span = SpanStorage.getAll()[0]
    expect(span?.name).toBe('sum')
    expect(span?.attributes['duration_ms']).toBeDefined()
  })

  it('returns a cleanup function synchronously and ends the span when cleanup runs', () => {
    let cleaned = false

    function collectCleanup(id: string) {
      void id
      return () => {
        cleaned = true
      }
    }

    const cleanup = traceFn(collectCleanup)('state-1')

    expect(typeof cleanup).toBe('function')
    expect(cleaned).toBe(false)

    const span = SpanStorage.getAll()[0]
    expect(span?.name).toBe('collectCleanup')
    expect(span?.attributes['duration_ms']).toBeUndefined()

    cleanup()

    expect(cleaned).toBe(true)
    expect(span?.attributes['duration_ms']).toBeDefined()
  })

  it('traces async functions', async () => {
    async function fetchValue(id: string) {
      return id
    }

    await expect(traceFn(fetchValue)('abc')).resolves.toBe('abc')

    const span = SpanStorage.getAll()[0]
    expect(span?.name).toBe('fetchValue')
    expect(span?.attributes['duration_ms']).toBeDefined()
  })

  it('defers async cleanup spans until cleanup runs', async () => {
    let cleaned = false

    async function collectCleanup(id: string) {
      void id
      return () => {
        cleaned = true
      }
    }

    const cleanup = await traceFn(collectCleanup)('state-1')

    expect(typeof cleanup).toBe('function')
    expect(cleaned).toBe(false)

    const span = SpanStorage.getAll()[0]
    expect(span?.attributes['duration_ms']).toBeUndefined()

    cleanup()

    expect(cleaned).toBe(true)
    expect(span?.attributes['duration_ms']).toBeDefined()
  })

  it('injects span as the last argument when the callback declares span', async () => {
    let receivedSpan: unknown

    const traced = traceFn(async (value: string, span: Span) => {
      receivedSpan = span
      span?.addAttribute('operation', 'test')
      return value
    })

    await traced('hello')

    expect(receivedSpan).toBeDefined()
    expect(
      (receivedSpan as { attributes: Record<string, string> }).attributes,
    ).toMatchObject({
      operation: 'test',
    })
  })

  it('uses an explicit parent span for nested calls', async () => {
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

  it('uses parent span from the last call argument', async () => {
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
    const parent = spans.find(
      (span) => span.attributes['operation'] === 'onBeforeDelete',
    )
    const children = spans.filter((span) => span.name === 'removeState')

    expect(children.length).toBe(2)
    for (const child of children) {
      expect(child.context.parentId).toBe(parent?.context.spanId)
    }
  })

  it('does not link nested calls without an explicit parent span', async () => {
    async function removeState(versionId: string, stateId: string) {
      return { versionId, stateId }
    }

    const onBeforeDelete = traceFn(async ({ ids }: { ids: string[] }) => {
      for (const id of ids) {
        await traceFn(removeState)('v1', id)
      }
      return true
    })

    await onBeforeDelete({ ids: ['a', 'b'] })

    const spans = SpanStorage.getAll()
    expect(spans.length).toBe(3)

    for (const span of spans) {
      expect(span.context.parentId).toBeNull()
    }
  })
})
