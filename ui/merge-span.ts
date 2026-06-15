import type { SpanData } from '../src/core/types'

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

export function mergeSpanUpdate(
  existing: SpanData,
  incoming: SpanData,
): SpanData {
  const annotations = [...(existing.annotations ?? [])]

  for (const annotation of incoming.annotations ?? []) {
    if (!annotation?.value) continue

    const duplicate = annotations.some(
      (item) =>
        item.timestamp === annotation.timestamp &&
        item.value === annotation.value,
    )
    if (!duplicate) annotations.push(annotation)
  }

  const mergedLogs = mergeStoredLogs(
    existing.tags?.['devtrace.logs'],
    incoming.tags?.['devtrace.logs'],
  )

  const tags = {
    ...existing.tags,
    ...incoming.tags,
    ...(mergedLogs ? { 'devtrace.logs': mergedLogs } : {}),
  }

  return {
    ...incoming,
    duration: incoming.duration ?? existing.duration,
    tags: Object.keys(tags).length ? tags : undefined,
    annotations: annotations.length ? annotations : undefined,
  }
}
