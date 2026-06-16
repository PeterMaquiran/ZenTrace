import type { SpanData } from '../src/core/types'
import { extractTestMeta } from '../src/testing/session'

import { extractHttp, extractLogs } from './span-details'
import type { TraceEvent, TraceNode, TraceViewData } from './types'

export type { TraceViewData }

const MODULE_COLORS: Record<string, string> = {
  auth: '#ffb300',
  payment: '#f44336',
  frontend: '#4caf50',
  demo: '#0084ff',
  http: '#7c4dff',
  checkout: '#00bcd4',
  pricing: '#ff9800',
  inventory: '#8bc34a',
  fraud: '#e91e63',
  gateway: '#9c27b0',
  notification: '#607d8b',
}

function colorForSpan(span: SpanData): string {
  const module = span.tags?.module
  if (module && MODULE_COLORS[module]) return MODULE_COLORS[module]
  if (span.tags?.component === 'http' || span.name.startsWith('HTTP ')) {
    return MODULE_COLORS.http
  }
  return hashColor(span.name)
}

function hashColor(value: string): string {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash)
  }
  return `hsl(${hash % 360} 70% 55%)`
}

function toMs(microseconds: number): number {
  return microseconds / 1000
}

function buildNode(
  span: SpanData,
  allSpans: SpanData[],
  traceStartUs: number,
): TraceNode {
  const children = allSpans
    .filter((candidate) => candidate.parentId === span.id)
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((child) => buildNode(child, allSpans, traceStartUs))

  const durationMs = span.duration
    ? toMs(span.duration)
    : Number(span.tags?.duration_ms ?? 0)

  const http = extractHttp(span)
  const logs = extractLogs(span, traceStartUs)

  const events = span.annotations
    ?.filter(
      (annotation) =>
        typeof annotation.value === 'string' &&
        !annotation.value.match(/^\[(log|info|warn|error)\]/),
    )
    .map(
      (annotation): TraceEvent => ({
        name: annotation.value,
        timestampMs: toMs(annotation.timestamp - traceStartUs),
      }),
    )

  return {
    name: span.name,
    spanId: span.id,
    startMs: toMs(span.timestamp - traceStartUs),
    durationMs: Math.max(durationMs, 1),
    colorHex: colorForSpan(span),
    input: span.tags?.input,
    output: span.tags?.output,
    events,
    logs: logs.length > 0 ? logs : undefined,
    http,
    module: span.tags?.module,
    isHttp: Boolean(http),
    hasError: span.tags?.error === 'true',
    children,
  }
}

export function buildTraceView(spans: SpanData[]): TraceViewData | null {
  if (spans.length === 0) return null

  const traceStartUs = Math.min(...spans.map((span) => span.timestamp))
  const roots = spans
    .filter((span) => !span.parentId)
    .sort((a, b) => a.timestamp - b.timestamp)

  if (roots.length === 0) return null

  const rootNodes = roots.map((root) => buildNode(root, spans, traceStartUs))

  if (rootNodes.length === 1) {
    const root = rootNodes[0]
    return {
      totalDurationMs: Math.max(
        root.startMs + root.durationMs,
        root.durationMs,
      ),
      rootSpan: root,
      testMeta: readTestMeta(roots[0]),
    }
  }

  const totalDurationMs = Math.max(
    ...rootNodes.map((node) => node.startMs + node.durationMs),
    1,
  )

  return {
    totalDurationMs,
    rootSpan: {
      name: 'trace',
      startMs: 0,
      durationMs: totalDurationMs,
      colorHex: '#4caf50',
      children: rootNodes,
    },
    testMeta: readTestMeta(roots.at(-1)),
  }
}

function readTestMeta(root?: SpanData) {
  const meta = extractTestMeta(root?.tags)
  if (!meta) return undefined
  return {
    title: meta.title,
    file: meta.file,
    project: meta.project,
  }
}

export function countTraceSignals(root: TraceNode): {
  logs: number
  http: number
} {
  let logs = root.logs?.length ?? 0
  let http = root.isHttp ? 1 : 0

  for (const child of root.children) {
    const nested = countTraceSignals(child)
    logs += nested.logs
    http += nested.http
  }

  return { logs, http }
}

export function findTraceRootId(span: SpanData, spans: SpanData[]): string {
  const byId = new Map(spans.map((item) => [item.id, item]))
  let current = span
  let guard = spans.length + 1

  while (current.parentId && guard-- > 0) {
    const parent = byId.get(current.parentId)
    if (!parent) break
    current = parent
  }

  return current.id
}

export function latestRootSpanId(spans: SpanData[]): string | null {
  const roots = spans
    .filter((span) => !span.parentId)
    .sort((a, b) => a.timestamp - b.timestamp)

  return roots.at(-1)?.id ?? null
}

export type TraceSummary = {
  rootId: string
  name: string
  timestampUs: number
  durationMs: number
  spanCount: number
  hasError: boolean
  testTitle?: string
}

export function listTraceSummaries(spans: SpanData[]): TraceSummary[] {
  const roots = spans
    .filter((span) => !span.parentId)
    .sort((a, b) => b.timestamp - a.timestamp)

  return roots.map((root) => {
    const traceSpans = filterSpansByRoot(spans, root.id)
    const durationMs = root.duration
      ? root.duration / 1000
      : Number(root.tags?.duration_ms ?? 0)
    const testMeta = readTestMeta(root)

    return {
      rootId: root.id,
      name: root.name,
      timestampUs: root.timestamp,
      durationMs: Math.max(durationMs, 1),
      spanCount: traceSpans.length,
      hasError: traceSpans.some((span) => span.tags?.error === 'true'),
      testTitle: testMeta?.title,
    }
  })
}

export function filterSpansByRoot(
  spans: SpanData[],
  rootId: string,
): SpanData[] {
  const childrenByParent = new Map<string, SpanData[]>()

  for (const span of spans) {
    if (!span.parentId) continue
    const siblings = childrenByParent.get(span.parentId) ?? []
    siblings.push(span)
    childrenByParent.set(span.parentId, siblings)
  }

  const included = new Set<string>()
  const visit = (id: string) => {
    if (included.has(id)) return
    included.add(id)
    for (const child of childrenByParent.get(id) ?? []) {
      visit(child.id)
    }
  }

  visit(rootId)
  return spans.filter((span) => included.has(span.id))
}
