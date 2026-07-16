import type { SpanData } from '../../core/types'
import { getUntracedFetch } from '../../instrumentation/http'
import type { Exporter } from '../base'

export type ZipkinExporterOptions = {
  /** Zipkin v2 spans endpoint. Defaults to http://localhost:9411/api/v2/spans */
  endpoint?: string
  authToken?: string
  /** Overrides span localEndpoint.serviceName (default Tracer name, e.g. "zentrace"). */
  serviceName?: string
}

const DEFAULT_ENDPOINT = 'http://localhost:9411/api/v2/spans'

export const ZIPKIN_EXPORTER_ID = 'zipkin'

export class ZipkinExporter implements Exporter {
  readonly exporterId = ZIPKIN_EXPORTER_ID

  private readonly endpoint: string
  private readonly authToken?: string
  private readonly serviceName?: string

  constructor(options: ZipkinExporterOptions = {}) {
    this.endpoint = options.endpoint ?? DEFAULT_ENDPOINT
    this.authToken = options.authToken
    this.serviceName = options.serviceName
  }

  async export(span: SpanData): Promise<void> {
    // Must bypass patched fetch — otherwise HTTP auto-tracing re-exports forever.
    const fetchImpl = getUntracedFetch()
    const body = serializeZipkinSpans([span], this.serviceName)
    const res = await fetchImpl(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.authToken ? { Authorization: this.authToken } : {}),
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

/** Zipkin v2 requires timestamp/duration as integer microseconds (long). */
export function toZipkinSpan(
  span: SpanData,
  serviceName?: string,
): Record<string, unknown> {
  const durationUs = toLongMicros(span.duration)

  const payload: Record<string, unknown> = {
    traceId: span.traceId,
    id: span.id,
    name: span.name,
    timestamp: toLongMicros(span.timestamp) ?? 0,
    localEndpoint: {
      serviceName: serviceName ?? span.localEndpoint.serviceName,
    },
  }

  if (span.parentId) payload.parentId = span.parentId
  if (durationUs !== undefined) payload.duration = durationUs
  if (span.tags) payload.tags = span.tags
  if (span.annotations?.length) {
    payload.annotations = span.annotations.map((a) => ({
      value: a.value,
      timestamp: toLongMicros(a.timestamp) ?? 0,
    }))
  }

  return payload
}

function toLongMicros(value: number | undefined | null): number | undefined {
  if (value === undefined || value === null) return undefined
  const n = Math.round(Number(value))
  return Number.isFinite(n) ? n : undefined
}

function serializeZipkinSpans(spans: SpanData[], serviceName?: string): string {
  // Replacer is a last line of defense against float micros from any caller.
  return JSON.stringify(
    spans.map((span) => toZipkinSpan(span, serviceName)),
    (_key, value) => {
      if (typeof value === 'number' && !Number.isInteger(value)) {
        return Math.round(value)
      }
      return value
    },
  )
}
