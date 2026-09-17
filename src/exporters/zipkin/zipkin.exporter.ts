import type { SpanData } from '../../core/types.js'
import { getUntracedFetch } from '../../instrumentation/http.js'
import type { Exporter } from '../base.js'

export type ZipkinExporterOptions = {
  /** Zipkin v2 spans endpoint. Defaults to `http://localhost:9411/api/v2/spans`. */
  endpoint?: string
  /** Full `Authorization` header value, e.g. `Bearer <token>`. */
  authToken?: string
  /** Extra request headers (merged after Content-Type / Authorization). */
  headers?: Record<string, string>
  /** Overrides span `localEndpoint.serviceName` (default Tracer name). */
  serviceName?: string
}

const DEFAULT_ENDPOINT = 'http://localhost:9411/api/v2/spans'

export const ZIPKIN_EXPORTER_ID = 'zipkin'

export class ZipkinExporter implements Exporter {
  readonly exporterId = ZIPKIN_EXPORTER_ID

  private readonly endpoint: string
  private readonly authToken?: string
  private readonly headers?: Record<string, string>
  private readonly serviceName?: string

  constructor(options: ZipkinExporterOptions = {}) {
    this.endpoint = options.endpoint ?? DEFAULT_ENDPOINT
    this.authToken = options.authToken
    this.headers = options.headers
    this.serviceName = options.serviceName
  }

  async export(span: SpanData): Promise<void> {
    if (isAutoHttpSpan(span)) return

    // Must bypass patched fetch — otherwise HTTP auto-tracing re-exports forever.
    const fetchImpl = getUntracedFetch()
    const body = serializeZipkinSpans([span], {
      serviceName: this.serviceName,
    })
    const res = await fetchImpl(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.authToken ? { Authorization: this.authToken } : {}),
        ...this.headers,
      },
      body,
    })

    if (!res.ok) {
      throw new Error(
        `Zipkin export failed (${res.status}): ${await res.text()}`,
      )
    }
  }
}

/** Auto-traced `fetch` spans stay in DevTools — Zipkin only gets app spans. */
function isAutoHttpSpan(span: SpanData): boolean {
  return span.tags?.component === 'http'
}

type ZipkinSpanOptions = Pick<ZipkinExporterOptions, 'serviceName'>

/** Zipkin v2 requires timestamp/duration as integer microseconds (long). */
export function toZipkinSpan(
  span: SpanData,
  options: ZipkinSpanOptions = {},
): Record<string, unknown> {
  const durationUs = toLongMicros(span.duration)
  const tags = sanitizeZipkinTags(span.tags, span.userAttributeKeys)

  const payload: Record<string, unknown> = {
    traceId: span.traceId,
    id: span.id,
    name: span.name,
    timestamp: toLongMicros(span.timestamp) ?? 0,
    localEndpoint: {
      serviceName: options.serviceName ?? span.localEndpoint.serviceName,
    },
  }

  if (span.parentId) payload.parentId = span.parentId
  if (durationUs !== undefined) payload.duration = durationUs
  if (tags) payload.tags = tags
  if (span.annotations?.length) {
    payload.annotations = span.annotations.map((a) => ({
      value: a.value,
      timestamp: toLongMicros(a.timestamp) ?? 0,
    }))
  }

  return payload
}

const ZIPKIN_OMIT_TAGS = new Set(['zentrace.logs'])
const ZIPKIN_CAPTURED_IO_TAGS = new Set(['input', 'output'])

function sanitizeZipkinTags(
  tags: Record<string, string> | undefined,
  userAttributeKeys: string[] | undefined,
): Record<string, string> | undefined {
  if (!tags) return undefined

  const userKeys = new Set(userAttributeKeys)
  const next: Record<string, string> = {}

  for (const [key, value] of Object.entries(tags)) {
    if (ZIPKIN_OMIT_TAGS.has(key)) continue
    if (ZIPKIN_CAPTURED_IO_TAGS.has(key) && !userKeys.has(key)) continue
    next[key] = value
  }

  return Object.keys(next).length ? next : undefined
}

function toLongMicros(value: number | undefined | null): number | undefined {
  if (value === undefined || value === null) return undefined
  const n = Math.round(Number(value))
  return Number.isFinite(n) ? n : undefined
}

function serializeZipkinSpans(
  spans: SpanData[],
  options: ZipkinSpanOptions = {},
): string {
  // Replacer is a last line of defense against float micros from any caller.
  return JSON.stringify(
    spans.map((span) => toZipkinSpan(span, options)),
    (_key, value) => {
      if (typeof value === 'number' && !Number.isInteger(value)) {
        return Math.round(value)
      }
      return value
    },
  )
}
