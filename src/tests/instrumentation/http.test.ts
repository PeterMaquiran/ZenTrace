import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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
})
