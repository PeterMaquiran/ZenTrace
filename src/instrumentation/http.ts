import { runSpan } from '../core/run-span'
import { inject } from '../util/inject'

type HttpTraceOptions = {
  serviceName?: string
}

/** Captured before any patch — used for the actual network call. */
const nativeFetch =
  typeof globalThis.fetch === 'function'
    ? globalThis.fetch.bind(globalThis)
    : undefined

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
  const spanName = `HTTP ${method} ${url}`

  return runSpan(
    spanName,
    async (span) => {
      span.addAttribute('http.method', method)
      span.addAttribute('http.url', url)
      span.addAttribute('component', 'http')

      const headers = mergeHeaders(input, init)
      inject(headers, span.context)

      const fetchImpl = originalFetch ?? nativeFetch
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
    { serviceName: options.serviceName, module: 'http' },
  ) as Promise<Response>
}

let installed = false
let originalFetch: typeof fetch | undefined

export function installHttpTracing(options: HttpTraceOptions = {}) {
  if (installed || typeof globalThis.fetch !== 'function') return
  installed = true
  originalFetch = globalThis.fetch.bind(globalThis)

  globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) =>
    traceFetch(input, init, options)
}

export function uninstallHttpTracing() {
  if (!installed || !originalFetch) return

  globalThis.fetch = originalFetch
  originalFetch = undefined
  installed = false
}
