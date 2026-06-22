import type { SpanData } from '../src/core/types'

import type { TraceHttp, TraceLog, TraceEvent } from './types'

const LOG_PATTERN = /^\[(log|info|warn|error)\]\s*(.*)$/s
const SPAN_LOGS_TAG = 'devtrace.logs'

type StoredSpanLog = {
  level: string
  message: string
  ts: number
}

function readStoredLogs(raw?: string): StoredSpanLog[] {
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as StoredSpanLog[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function parseLogAnnotation(
  value: string,
): Omit<TraceLog, 'timestampMs'> | null {
  const match = value.match(LOG_PATTERN)
  if (!match) return null

  return {
    level: match[1] as TraceLog['level'],
    message: match[2],
  }
}

export function extractLogs(span: SpanData, traceStartUs: number): TraceLog[] {
  const traceStartMs = traceStartUs / 1000
  const storedLogs = readStoredLogs(span.tags?.[SPAN_LOGS_TAG])

  // Runtime writes each console line to annotations, log.* tags, and
  // devtrace.logs. Use one canonical source so the UI does not show duplicates.
  if (storedLogs.length > 0) {
    return storedLogs
      .map((entry) => ({
        level: entry.level as TraceLog['level'],
        message: entry.message,
        timestampMs: entry.ts - traceStartMs,
      }))
      .sort((a, b) => a.timestampMs - b.timestampMs)
  }

  const logs: TraceLog[] = []
  const seen = new Set<string>()

  for (const annotation of span.annotations ?? []) {
    const parsed = parseLogAnnotation(annotation.value)
    if (!parsed) continue

    const key = `${parsed.level}:${parsed.message}:${annotation.timestamp}`
    if (seen.has(key)) continue
    seen.add(key)

    logs.push({
      ...parsed,
      timestampMs: (annotation.timestamp - traceStartUs) / 1000,
    })
  }

  if (logs.length > 0) {
    return logs.sort((a, b) => a.timestampMs - b.timestampMs)
  }

  for (const level of ['log', 'info', 'warn', 'error'] as const) {
    const message = span.tags?.[`log.${level}`]
    if (!message) continue

    logs.push({
      level,
      message,
      timestampMs: (span.timestamp - traceStartUs) / 1000,
    })
  }

  return logs.sort((a, b) => a.timestampMs - b.timestampMs)
}

export function extractHttp(span: SpanData): TraceHttp | undefined {
  const isHttp =
    span.tags?.component === 'http' || span.name.startsWith('HTTP ')

  if (!isHttp) return undefined

  const method =
    span.tags?.['http.method'] ?? span.name.match(/^HTTP (\w+)/)?.[1] ?? 'GET'

  const url = span.tags?.['http.url'] ?? span.name.replace(/^HTTP \w+ /, '')

  const status = span.tags?.['http.status']
    ? Number(span.tags['http.status'])
    : undefined

  return {
    method,
    url,
    status,
    statusText: span.tags?.['http.status_text'],
  }
}

export function isHttpSpan(span: SpanData): boolean {
  return span.tags?.component === 'http' || span.name.startsWith('HTTP ')
}

export function partitionEvents(events: TraceEvent[] | undefined): {
  logs: TraceLog[]
  milestones: TraceEvent[]
} {
  const logs: TraceLog[] = []
  const milestones: TraceEvent[] = []

  for (const event of events ?? []) {
    const parsed = parseLogAnnotation(event.name)
    if (parsed) {
      logs.push({ ...parsed, timestampMs: event.timestampMs })
    } else {
      milestones.push(event)
    }
  }

  return { logs, milestones }
}

export function httpStatusClass(status?: number): string {
  if (!status) return 'http-status-pending'
  if (status >= 500) return 'http-status-error'
  if (status >= 400) return 'http-status-warn'
  if (status >= 200) return 'http-status-ok'
  return 'http-status-pending'
}
