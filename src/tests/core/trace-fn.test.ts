import { describe, it, expect, beforeEach } from 'vitest'

import { traceFn } from '../../decorator/function'
import { SpanStorage } from '../../storage/memory-storage'

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
})
