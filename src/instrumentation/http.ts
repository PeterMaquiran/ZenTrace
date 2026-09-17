import type { Span } from '../core/span.js'
import { runSpan } from '../runtime/run-span.js'
import { extractParentSpanFromHeaders } from '../runtime/trace-runtime.js'
import { inject } from '../util/inject.js'

import { registerHttpTracingEnsure } from './http-auto.js'

type HttpTraceOptions = {
  serviceName?: string
  parentSpan?: Span
}

const HTTP_TRACING_KEY = '__ZENTRACE_HTTP_TRACING__'

type HttpTracingState = {
  nativeFetch?: typeof fetch
  installed: boolean
}

function getHttpTracingState(): HttpTracingState {
  const globalRef = globalThis as typeof globalThis & {
    [HTTP_TRACING_KEY]?: HttpTracingState
  }

  if (!globalRef[HTTP_TRACING_KEY]) {
    globalRef[HTTP_TRACING_KEY] = { installed: false }
  }

  return globalRef[HTTP_TRACING_KEY]
}

function ensureNativeFetchCaptured(): typeof fetch | undefined {
  const state = getHttpTracingState()
  if (state.nativeFetch) return state.nativeFetch
  if (typeof globalThis.fetch !== 'function') return undefined

  state.nativeFetch = globalThis.fetch.bind(globalThis)
  return state.nativeFetch
}

function resolveUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.toString()
  return input.url
}

function resolveMethod(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) return init.method.toUpperCase()
  if (input instanceof Request) return input.method.toUpperCase()
  return 'GET'
}

function mergeHeaders(
  input: RequestInfo | URL,
  init?: RequestInit,
): Record<string, string> {
  const headers: Record<string, string> = {}

  if (input instanceof Request) {
    input.headers.forEach((value, key) => {
      headers[key] = value
    })
  }

  const initHeaders = init?.headers
  if (initHeaders instanceof Headers) {
    initHeaders.forEach((value, key) => {
      headers[key] = value
    })
  } else if (Array.isArray(initHeaders)) {
    for (const [key, value] of initHeaders) {
      headers[key] = value
    }
  } else if (initHeaders) {
    Object.assign(headers, initHeaders)
  }

  return headers
}

export async function traceFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  options: HttpTraceOptions = {},
): Promise<Response> {
  const url = resolveUrl(input)
  const method = resolveMethod(input, init)
  const spanName = `HTTP ${method}`
  const headers = mergeHeaders(input, init)
  const parentSpan = extractParentSpanFromHeaders(headers) ?? options.parentSpan

  return runSpan(
    spanName,
    async (span) => {
      span.addAttribute('http.method', method)
      span.addAttribute('http.url', url)
      span.addAttribute('component', 'http')

      inject(headers, span.context)

      const fetchImpl = getHttpTracingState().nativeFetch
      if (!fetchImpl) {
        throw new Error('fetch is not available')
      }

      const response = await fetchImpl(input, {
        ...init,
        headers,
      })

      span.addAttribute('http.status', String(response.status))
      span.addAttribute(
        'http.status_text',
        response.statusText || String(response.status),
      )

      return response
    },
    {
      serviceName: options.serviceName,
      module: 'http',
      parentSpan,
    },
  ) as Promise<Response>
}

/** Fetch that bypasses HTTP auto-tracing (for exporters / internal calls). */
export function getUntracedFetch(): typeof fetch {
  const state = getHttpTracingState()
  if (state.installed && state.nativeFetch) return state.nativeFetch
  return globalThis.fetch.bind(globalThis)
}

function isExporterRequest(url: string): boolean {
  // Zipkin v2 ingestion — tracing these would recurse forever.
  return url.includes('/api/v2/spans')
}

export function installHttpTracing(options: HttpTraceOptions = {}) {
  const nativeFetch = ensureNativeFetchCaptured()
  if (!nativeFetch) return

  globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (isExporterRequest(resolveUrl(input))) {
      return nativeFetch(input, init)
    }
    return traceFetch(input, init, options)
  }

  getHttpTracingState().installed = true
}

/** Patches `fetch` on first span so HTTP shows in the dashboard. */
export function ensureHttpTracing() {
  if (getHttpTracingState().installed) return
  installHttpTracing()
}

registerHttpTracingEnsure(ensureHttpTracing)

export function uninstallHttpTracing() {
  const state = getHttpTracingState()
  if (!state.installed || !state.nativeFetch) return

  globalThis.fetch = state.nativeFetch
  state.installed = false
}

export function resetHttpTracingForTests() {
  const state = getHttpTracingState()
  if (state.installed && state.nativeFetch) {
    globalThis.fetch = state.nativeFetch
  }

  delete (globalThis as typeof globalThis & { [HTTP_TRACING_KEY]?: unknown })[
    HTTP_TRACING_KEY
  ]
}
