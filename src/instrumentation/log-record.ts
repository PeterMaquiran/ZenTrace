import type { Span } from '../core/span'

export type StoredSpanLog = {
  level: string
  message: string
  fields?: Record<string, unknown>
  ts: number
}

const LOGS_TAG = 'zentrace.logs'

export function recordSpanLog(
  span: Span,
  level: string,
  message: string,
  fields?: Record<string, unknown>,
): void {
  span.addEvent(`[${level}] ${message}`)
  span.addAttribute(`log.${level}`, message)

  const entries = readStoredLogs(span.attributes[LOGS_TAG])
  const entry: StoredSpanLog = { level, message, ts: Date.now() }
  if (fields && Object.keys(fields).length > 0) entry.fields = fields
  entries.push(entry)
  span.addAttribute(LOGS_TAG, JSON.stringify(entries))
}

export function readStoredLogs(raw?: string): StoredSpanLog[] {
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as StoredSpanLog[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function mergeStoredLogs(
  existing?: string,
  incoming?: string,
): string | undefined {
  const merged = [...readStoredLogs(existing)]

  for (const entry of readStoredLogs(incoming)) {
    const duplicate = merged.some(
      (item) =>
        item.ts === entry.ts &&
        item.level === entry.level &&
        item.message === entry.message,
    )
    if (!duplicate) merged.push(entry)
  }

  return merged.length > 0 ? JSON.stringify(merged) : undefined
}

export const SPAN_LOGS_TAG = LOGS_TAG
