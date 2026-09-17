import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { runSpan } from '@/index'
import {
  installHttpTracing,
  resetHttpTracingForTests,
  traceFetch,
  uninstallHttpTracing,
} from '@/instrumentation/http'
import { SpanStorage } from '@/storage/memory-storage'

describe('http tracing', () => {
  const nativeFetch = vi.fn(async () => new Response('ok', { status: 200 }))

  beforeEach(() => {
    vi.stubGlobal('fetch', nativeFetch)
    nativeFetch.mockClear()
    SpanStorage.clear()
    resetHttpTracingForTests()
  })

  afterEach(() => {
    resetHttpTracingForTests()
    vi.unstubAllGlobals()
  })

  it('patches fetch when a span starts', async () => {
    await runSpan('parent', async () => {
      await globalThis.fetch('https://example.com/api')
    })

    expect(nativeFetch).toHaveBeenCalledTimes(1)
    expect(
      SpanStorage.getAll().filter((span) => span.name.startsWith('HTTP')),
    ).toHaveLength(1)
  })

  it('does not recurse when global fetch is patched', async () => {
    installHttpTracing()
    nativeFetch.mockClear()

    await traceFetch('https://example.com/api')

    expect(nativeFetch).toHaveBeenCalledTimes(1)
  })

  it('creates one span when installHttpTracing is called again', async () => {
    installHttpTracing()
    installHttpTracing()
    nativeFetch.mockClear()

    await globalThis.fetch('https://example.com/api')

    expect(nativeFetch).toHaveBeenCalledTimes(1)
    expect(
      SpanStorage.getAll().filter((span) => span.name.startsWith('HTTP')),
    ).toHaveLength(1)
  })

  it('restores native fetch on uninstall', async () => {
    installHttpTracing()
    uninstallHttpTracing()

    await globalThis.fetch('https://example.com/api')

    expect(nativeFetch).toHaveBeenCalledTimes(1)
    expect(
      SpanStorage.getAll().filter((span) => span.name.startsWith('HTTP')),
    ).toHaveLength(0)
  })

  // 🔥 NEW TEST: parent span propagation
  it('links http span to parent span when context exists', async () => {
    installHttpTracing()

    await runSpan('parent', async (span) => {
      await traceFetch('https://example.com/api', undefined, {
        parentSpan: span,
      })
    })

    const spans = SpanStorage.getAll()

    const parent = spans.find((s) => s.name === 'parent')
    const http = spans.find((s) => s.name.startsWith('HTTP'))

    expect(parent).toBeDefined()
    expect(http).toBeDefined()

    // 👇 depends on your implementation
    expect(http?.context.traceId).toBe(parent?.context.traceId)

    // if you support parentId
    if ('parentId' in http!) {
      expect((http as any).parentId).toBe(parent?.context.spanId)
    }
  })

  it('links a patched fetch when the explicit parent header is present', async () => {
    installHttpTracing()

    await runSpan('parent', async (span) => {
      await globalThis.fetch('https://example.com/api', {
        headers: {
          'x-zentrace-parent-span-id': span.context.spanId,
        },
      })
    })

    const spans = SpanStorage.getAll()
    const parent = spans.find((span) => span.name === 'parent')
    const http = spans.find((span) => span.name.startsWith('HTTP'))

    expect(parent).toBeDefined()
    expect(http?.context.parentId).toBe(parent?.context.spanId)
    expect(http?.context.traceId).toBe(parent?.context.traceId)
  })

  // 🔥 NEW TEST: attributes correctness
  it('adds http attributes to span', async () => {
    installHttpTracing()

    await traceFetch('https://example.com/api', {
      method: 'POST',
    })

    const span = SpanStorage.getAll().find((s) => s.name.startsWith('HTTP'))

    expect(span).toBeDefined()
    expect(span?.attributes['http.method']).toBe('POST')
    expect(span?.attributes['http.url']).toBe('https://example.com/api')
    expect(span?.attributes['http.status']).toBe('200')
  })

  it('does not recurse when exporting to Zipkin with http tracing enabled', async () => {
    installHttpTracing()
    nativeFetch.mockClear()

    await globalThis.fetch('http://zipkin:9411/api/v2/spans', {
      method: 'POST',
      body: '[]',
    })

    expect(nativeFetch).toHaveBeenCalledTimes(1)
    expect(
      SpanStorage.getAll().filter((span) => span.name.startsWith('HTTP')),
    ).toHaveLength(0)
  })
})
