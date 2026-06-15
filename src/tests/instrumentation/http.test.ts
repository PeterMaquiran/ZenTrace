import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  installHttpTracing,
  traceFetch,
  uninstallHttpTracing,
} from '@/instrumentation/http'

describe('http tracing', () => {
  const nativeFetch = vi.fn(async () => new Response('ok', { status: 200 }))

  beforeEach(() => {
    vi.stubGlobal('fetch', nativeFetch)
    nativeFetch.mockClear()
    uninstallHttpTracing()
  })

  afterEach(() => {
    uninstallHttpTracing()
    vi.unstubAllGlobals()
  })

  it('does not recurse when global fetch is patched', async () => {
    installHttpTracing()
    nativeFetch.mockClear()

    await traceFetch('https://example.com/api')

    expect(nativeFetch).toHaveBeenCalledTimes(1)
  })
})
