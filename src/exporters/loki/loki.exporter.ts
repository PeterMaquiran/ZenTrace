import type { SpanData } from '../../core/types'
import { getUntracedFetch } from '../../instrumentation/http'
import { readStoredLogs } from '../../instrumentation/log-record'
import type { Exporter } from '../base'

export type LokiExporterOptions = {
  /** Loki push endpoint. Defaults to http://localhost:3100/loki/api/v1/push. */
  endpoint?: string
  authToken?: string
  /** Grafana Cloud and multi-tenant Loki tenant ID. */
  tenantId?: string
  serviceName?: string
  /** Extra low-cardinality stream labels. Trace IDs should not be labels. */
  labels?: Record<string, string>
  headers?: Record<string, string>
}

type LokiValue = [timestamp: string, line: string]

type LokiStream = {
  stream: Record<string, string>
  values: LokiValue[]
}

type LokiLine = {
  timestampMs: number
  level: string
  message: string
  fields?: Record<string, unknown>
}

const DEFAULT_ENDPOINT = 'http://localhost:3100/loki/api/v1/push'

export const LOKI_EXPORTER_ID = 'loki'

export class LokiExporter implements Exporter {
  readonly exporterId = LOKI_EXPORTER_ID

  private readonly options: LokiExporterOptions

  constructor(options: LokiExporterOptions = {}) {
    this.options = options
  }

  async export(span: SpanData): Promise<void> {
    const streams = toLokiStreams(span, this.options)
    if (streams.length === 0) return

    const response = await getUntracedFetch()(
      this.options.endpoint ?? DEFAULT_ENDPOINT,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.options.authToken
            ? { Authorization: this.options.authToken }
            : {}),
          ...(this.options.tenantId
            ? { 'X-Scope-OrgID': this.options.tenantId }
            : {}),
          ...this.options.headers,
        },
        body: JSON.stringify({ streams }),
      },
    )

    if (!response.ok) {
      throw new Error(
        `Loki export failed (${response.status}): ${await response.text()}`,
      )
    }
  }
}

export function toLokiStreams(
  span: SpanData,
  options: Pick<LokiExporterOptions, 'labels' | 'serviceName'> = {},
): LokiStream[] {
  const lines = collectLokiLines(span)
  if (lines.length === 0) return []

  const serviceName = options.serviceName ?? span.localEndpoint.serviceName
  const streams = new Map<string, LokiStream>()

  for (const line of lines) {
    const labels = {
      ...sanitizeLabels(options.labels),
      service_name: serviceName,
      level: line.level,
    }
    const key = JSON.stringify(labels)
    let stream = streams.get(key)

    if (!stream) {
      stream = { stream: labels, values: [] }
      streams.set(key, stream)
    }

    stream.values.push([
      toNanoseconds(line.timestampMs),
      JSON.stringify({
        ...(line.fields ?? {}),
        timestamp: new Date(line.timestampMs).toISOString(),
        level: line.level,
        message: line.message,
        trace_id: span.traceId,
        span_id: span.id,
        ...(span.parentId ? { parentSpanId: span.parentId } : {}),
        spanName: span.name,
      }),
    ])
  }

  return [...streams.values()]
}

function collectLokiLines(span: SpanData): LokiLine[] {
  const lines: LokiLine[] = []

  for (const log of readStoredLogs(span.tags?.['zentrace.logs'])) {
    lines.push({
      timestampMs: log.ts,
      level: log.level,
      message: log.message,
      fields: log.fields,
    })
  }

  const ioLine = spanIoLine(span)
  if (ioLine) lines.push(ioLine)

  return lines
}

/** Emit captured @trace input/output as a structured Loki line. */
function spanIoLine(span: SpanData): LokiLine | undefined {
  const input = parseTagJson(span.tags?.input)
  const output = parseTagJson(span.tags?.output)
  if (input === undefined && output === undefined) return undefined

  const fields: Record<string, unknown> = { event: 'span' }
  if (input !== undefined) fields.input = input
  if (output !== undefined) fields.output = output
  if (span.tags?.duration_ms !== undefined) {
    fields.duration_ms = Number(span.tags.duration_ms)
  }
  if (span.tags?.module) fields.module = span.tags.module
  if (span.tags?.error === 'true') fields.error = true

  const endUs = span.timestamp + (span.duration ?? 0)

  return {
    timestampMs: Math.floor(endUs / 1000),
    level: span.tags?.error === 'true' ? 'error' : 'info',
    message: span.name,
    fields,
  }
}

function parseTagJson(raw: string | undefined): unknown {
  if (raw === undefined) return undefined
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

function toNanoseconds(timestampMs: number): string {
  return (BigInt(Math.trunc(timestampMs)) * 1_000_000n).toString()
}

function sanitizeLabels(
  labels: Record<string, string> | undefined,
): Record<string, string> {
  if (!labels) return {}

  return Object.fromEntries(
    Object.entries(labels).map(([key, value]) => [
      sanitizeLabelName(key),
      String(value),
    ]),
  )
}

function sanitizeLabelName(key: string): string {
  let name = key.replace(/[^a-zA-Z0-9_]/g, '_')
  if (!/^[a-zA-Z_]/.test(name)) name = `_${name}`
  if (name.startsWith('__')) name = `zentrace${name}`
  return name || 'label'
}
