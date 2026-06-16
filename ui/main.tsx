import { render } from 'preact'
import { useEffect, useMemo, useRef, useState } from 'preact/hooks'

import type { SpanData } from '../src/core/types'

import { collectFlatLogs } from './collect-logs'
import { InspectorDrawer } from './component/InspectorDrawer'
import { LogsPanel } from './component/LogsPanel'
import { TraceListPanel } from './component/TraceListPanel'
import { TraceToolbar } from './component/TraceToolbar'
import './listener'
import './devtools-bridge'
import { EXAMPLE_TRACE_DATA } from './example.data'
import './style/global.scss'
import { mergeSpanUpdate } from './merge-span'
import { httpStatusClass } from './span-details'
import {
  buildTraceView,
  filterSpansByRoot,
  findTraceRootId,
  latestRootSpanId,
  listTraceSummaries,
} from './trace-model'
import {
  computeTraceStats,
  enrichNodesWithPerformance,
  filterTraceNodes,
  type TraceFilter,
} from './trace-stats'
import type { FlatRenderNode, TraceNode } from './types'

export type { FlatRenderNode, TraceEvent, TraceNode } from './types'

function PremiumTraceGantt() {
  const [liveSpans, setLiveSpans] = useState<SpanData[]>([])
  const rowHeight = 32

  useEffect(() => {
    return window.__TRACE__.subscribe((span) => {
      if (!span?.id) return

      setLiveSpans((current) => {
        try {
          const next = [...current]
          const index = next.findIndex((item) => item.id === span.id)
          if (index === -1) next.push(span)
          else next[index] = mergeSpanUpdate(next[index], span)
          return next
        } catch {
          const next = [...current]
          const index = next.findIndex((item) => item.id === span.id)
          if (index === -1) next.push(span)
          else next[index] = span
          return next
        }
      })
    })
  }, [])

  const isDevToolsPanel =
    typeof chrome !== 'undefined' && Boolean(chrome.devtools)

  // Selection id only — node data is always resolved from latest trace tree
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeTraceRootId, setActiveTraceRootId] = useState<string | null>(
    null,
  )
  const knownRootCountRef = useRef(0)

  const traceSummaries = useMemo(
    () => listTraceSummaries(liveSpans),
    [liveSpans],
  )

  const globalTraceStartUs = useMemo(
    () =>
      liveSpans.length > 0
        ? Math.min(...liveSpans.map((span) => span.timestamp))
        : 0,
    [liveSpans],
  )

  const resolvedTraceRootId = useMemo(() => {
    if (
      activeTraceRootId &&
      liveSpans.some((span) => span.id === activeTraceRootId)
    ) {
      return activeTraceRootId
    }
    return latestRootSpanId(liveSpans)
  }, [activeTraceRootId, liveSpans])

  const scopedSpans = useMemo(() => {
    if (!resolvedTraceRootId || liveSpans.length === 0) return liveSpans
    return filterSpansByRoot(liveSpans, resolvedTraceRootId)
  }, [liveSpans, resolvedTraceRootId])

  useEffect(() => {
    const rootCount = liveSpans.filter((span) => !span.parentId).length
    const latestRoot = latestRootSpanId(liveSpans)
    if (!latestRoot) {
      knownRootCountRef.current = 0
      return
    }

    setActiveTraceRootId((current) => {
      knownRootCountRef.current = rootCount
      if (!current) return latestRoot
      if (liveSpans.some((span) => span.id === current)) return current
      return latestRoot
    })
  }, [liveSpans])

  const traceData = useMemo(() => {
    const live = buildTraceView(scopedSpans)
    if (live) return live
    if (isDevToolsPanel) {
      return {
        totalDurationMs: 1,
        rootSpan: {
          name: 'waiting for traces',
          startMs: 0,
          durationMs: 1,
          colorHex: '#666',
          children: [],
        },
      }
    }
    return EXAMPLE_TRACE_DATA
  }, [isDevToolsPanel, scopedSpans])

  const usingLiveTrace = scopedSpans.length > 0
  const totalMs = traceData.totalDurationMs
  const traceStartUs = useMemo(
    () =>
      scopedSpans.length > 0
        ? Math.min(...scopedSpans.map((span) => span.timestamp))
        : 0,
    [scopedSpans],
  )

  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>(
    {},
  )
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [viewFilter, setViewFilter] = useState<TraceFilter>('all')
  const [screen, setScreen] = useState<'picker' | 'detail'>('picker')

  const hasLiveTraces = liveSpans.some((span) => !span.parentId)
  const showPicker = hasLiveTraces && screen === 'picker'

  // Flatten structures
  const flatNodesList = useMemo(() => {
    const accumulator: FlatRenderNode[] = []
    const flattenTreeData = (
      node: TraceNode,
      depth = 0,
      parentId: string | null = null,
      path = '',
    ) => {
      const currentId =
        node.spanId ?? (path ? `${path} -> ${node.name}` : node.name)
      const hasChildren = node.children && node.children.length > 0

      accumulator.push({
        span: node,
        depth,
        id: currentId,
        parentId,
        hasChildren,
      })

      if (hasChildren) {
        node.children.forEach((child) =>
          flattenTreeData(child, depth + 1, currentId, currentId),
        )
      }
    }
    flattenTreeData(traceData.rootSpan)
    return enrichNodesWithPerformance(
      accumulator,
      traceData.totalDurationMs,
      Math.max(100, traceData.totalDurationMs * 0.2),
    )
  }, [traceData])

  const traceStats = useMemo(
    () => computeTraceStats(flatNodesList, traceData.totalDurationMs),
    [flatNodesList, traceData.totalDurationMs],
  )

  const filteredNodesList = useMemo(
    () => filterTraceNodes(flatNodesList, viewFilter),
    [flatNodesList, viewFilter],
  )

  const selectedNode = useMemo(
    () => flatNodesList.find((node) => node.id === selectedId) ?? null,
    [flatNodesList, selectedId],
  )

  // Dynamic layout calculations
  const visibleNodesList = useMemo(() => {
    const list: FlatRenderNode[] = []
    for (const node of filteredNodesList) {
      let isHidden = false
      let currentParentId = node.parentId
      while (currentParentId) {
        if (collapsedNodes[currentParentId]) {
          isHidden = true
          break
        }
        const parentNode = filteredNodesList.find(
          (n) => n.id === currentParentId,
        )
        currentParentId = parentNode ? parentNode.parentId : null
      }
      if (!isHidden) list.push(node)
    }
    return list
  }, [filteredNodesList, collapsedNodes])

  const totalCanvasHeightPx = `${visibleNodesList.length * rowHeight}px`

  const toggleCollapse = (id: string) => {
    setCollapsedNodes((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const flatLogEntries = useMemo(
    () => collectFlatLogs(flatNodesList, scopedSpans, traceStartUs),
    [flatNodesList, scopedSpans, traceStartUs],
  )

  useEffect(() => {
    if (!selectedId) return
    if (!flatNodesList.some((node) => node.id === selectedId)) {
      setSelectedId(null)
    }
  }, [flatNodesList, selectedId])

  const selectTrace = (rootId: string) => {
    setActiveTraceRootId(rootId)
    setSelectedId(null)
    setViewFilter('all')
    setScreen('detail')
  }

  const backToTraces = () => {
    setSelectedId(null)
    setScreen('picker')
  }

  const selectSpan = (nodeId: string) => {
    setSelectedId(nodeId)

    const node = flatNodesList.find((item) => item.id === nodeId)
    const spanId = node?.span.spanId
    if (!spanId) return

    const rawSpan = liveSpans.find((span) => span.id === spanId)
    if (rawSpan) {
      setActiveTraceRootId(findTraceRootId(rawSpan, liveSpans))
    }
  }

  const clearTrace = () => {
    setLiveSpans([])
    setSelectedId(null)
    setActiveTraceRootId(null)
    setViewFilter('all')
    setScreen('picker')
    knownRootCountRef.current = 0
  }

  const rowClassName = (item: FlatRenderNode, extra = '') =>
    [
      extra,
      item.span.isSlow ? 'is-slow' : '',
      item.span.hasError ? 'has-error' : '',
    ]
      .filter(Boolean)
      .join(' ')

  return (
    <div class="dashboard-wrapper">
      <TraceToolbar
        usingLiveTrace={hasLiveTraces}
        mode={showPicker ? 'picker' : 'detail'}
        testMeta={'testMeta' in traceData ? traceData.testMeta : undefined}
        stats={showPicker ? undefined : traceStats}
        traceCount={traceSummaries.length}
        filter={viewFilter}
        onFilterChange={setViewFilter}
        onBack={hasLiveTraces && !showPicker ? backToTraces : undefined}
        onClear={clearTrace}
      />
      <div class="workspace">
        {showPicker ? (
          <div class="trace-screen-picker">
            <TraceListPanel
              traces={traceSummaries}
              traceStartUs={globalTraceStartUs}
              onSelectTrace={selectTrace}
              layout="full"
            />
          </div>
        ) : (
          <div class="trace-screen-detail">
            <div
              class={`split-view-container ${selectedNode ? 'inspector-open' : ''}`}
            >
              <div class="tree-panel">
                <h2>Span Tree</h2>

                <div class="tree-scroll-container">
                  <div
                    class="tree-canvas"
                    style={{ height: totalCanvasHeightPx }}
                  >
                    {visibleNodesList.map((item, index) => {
                      const isCollapsed = collapsedNodes[item.id]
                      const isHovered = hoveredNodeId === item.id
                      const isSelected = selectedNode?.id === item.id

                      return (
                        <div
                          key={`tree-${item.id}`}
                          class={`tree-row ${rowClassName(item, `${isHovered ? 'is-hovered' : ''} ${isSelected ? 'is-selected' : ''}`)}`}
                          style={
                            {
                              '--row-index': index,
                              paddingLeft: `${item.depth * 14 + 12}px`,
                            } as any
                          }
                          onMouseEnter={() => setHoveredNodeId(item.id)}
                          onMouseLeave={() => setHoveredNodeId(null)}
                          onClick={() => selectSpan(item.id)}
                        >
                          {/* Guides vertical lines */}
                          {item.depth > 0 &&
                            Array.from({ length: item.depth }).map((_, i) => (
                              <div
                                key={i}
                                class="tree-line-vertical"
                                style={{ left: `${i * 14 + 16}px` }}
                              />
                            ))}

                          {/* Node alignment elbows */}
                          {item.depth > 0 && (
                            <div
                              class="tree-line-horizontal"
                              style={{
                                left: `${(item.depth - 1) * 14 + 16}px`,
                                width: '10px',
                              }}
                            />
                          )}

                          <div class="tree-node-content">
                            {item.hasChildren ? (
                              <button
                                class={`collapse-toggle ${isCollapsed ? 'is-collapsed' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleCollapse(item.id)
                                }}
                              >
                                ▼
                              </button>
                            ) : (
                              <span class="tree-bullet">•</span>
                            )}
                            <span
                              class="tree-node-badge"
                              style={{ backgroundColor: item.span.colorHex }}
                            />
                            <span class="tree-node-name">{item.span.name}</span>
                            {item.span.isHttp && item.span.http && (
                              <span
                                class={`span-chip http-chip ${item.span.http.status ? httpStatusClass(item.span.http.status) : ''}`}
                              >
                                {item.span.http.method}
                              </span>
                            )}
                            {item.span.logs && item.span.logs.length > 0 && (
                              <span class="span-chip log-chip">
                                {item.span.logs.length} log
                                {item.span.logs.length === 1 ? '' : 's'}
                              </span>
                            )}
                            {item.span.hasError && (
                              <span class="span-chip error-chip">error</span>
                            )}
                            {item.span.isSlow && (
                              <span class="span-chip slow-chip">slow</span>
                            )}
                          </div>
                          <span class="tree-node-duration">
                            {item.span.durationMs}ms
                            {usingLiveTrace &&
                            item.span.percentOfTrace !== undefined ? (
                              <span class="tree-node-percent">
                                {' '}
                                ({item.span.percentOfTrace}%)
                              </span>
                            ) : null}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* ==========================================================================
           RIGHT PANEL: DEEP-DIVE SPAN GANTT TIMELINE
           ========================================================================== */}
              <div class="gantt-panel">
                <h2>Deep-Dive Gantt Timeline</h2>
                <div class="gantt-time-axis" aria-hidden="true">
                  <span>0ms</span>
                  <span>{Math.round(totalMs)}ms</span>
                </div>

                <div
                  class="trace-axis-canvas"
                  style={
                    { '--total-canvas-height': totalCanvasHeightPx } as any
                  }
                >
                  {/* ABSOLUTE CRITICAL PATH BRIDGES */}
                  {visibleNodesList.map((item, index) => {
                    if (item.parentId === null) return null

                    const parentIndex = visibleNodesList.findIndex(
                      (n) => n.id === item.parentId,
                    )
                    if (parentIndex === -1) return null

                    const parentItem = visibleNodesList[parentIndex]
                    const parentStartPct =
                      (parentItem.span.startMs / totalMs) * 100
                    const childStartPct = (item.span.startMs / totalMs) * 100

                    const isBridgeHighlighted = hoveredNodeId === item.id

                    const bridgeStyles = {
                      '--bridge-left': `${parentStartPct}%`,
                      '--bridge-width': `${childStartPct - parentStartPct}%`,
                      '--parent-index': parentIndex,
                      '--child-index': index,
                    } as any

                    return (
                      <div
                        key={`bridge-${item.id}`}
                        class={`trace-absolute-bridge ${isBridgeHighlighted ? 'highlight-bridge' : ''}`}
                        style={bridgeStyles}
                      />
                    )
                  })}

                  {/* ABSOLUTE WATERFALL GRAPH VISUAL PILLS */}
                  {visibleNodesList.map((item, index) => {
                    const leftPercent = (item.span.startMs / totalMs) * 100
                    const widthPercent = (item.span.durationMs / totalMs) * 100
                    const isHovered = hoveredNodeId === item.id
                    const isSelected = selectedNode?.id === item.id

                    const rowStyles = {
                      '--row-index': index,
                      'z-index': '0',
                    } as any

                    const barStyles = {
                      '--start-percent': `${leftPercent}%`,
                      '--width-percent': `${Math.max(widthPercent, 1.5)}%`,
                      '--bar-color': item.span.colorHex,
                      '--bar-color-translucent': `${item.span.colorHex}26`,
                    } as any

                    return (
                      <div
                        key={`bar-${item.id}`}
                        class={`timeline-row-wrapper ${rowClassName(item, `${isHovered ? 'is-hovered' : ''} ${isSelected ? 'is-selected' : ''}`)}`}
                        style={rowStyles}
                        onMouseEnter={() => setHoveredNodeId(item.id)}
                        onMouseLeave={() => setHoveredNodeId(null)}
                        onClick={() => selectSpan(item.id)}
                      >
                        <div class="waterfall-track">
                          <div class="waterfall-bar" style={barStyles}>
                            <span class="bar-label">{item.span.name}</span>

                            {/* Micro-Event Embedded Indication Points */}
                            <div class="bar-events-container">
                              {item.span.events?.map((evt, evtIdx) => {
                                const spanDuration = item.span.durationMs || 1
                                const relativePercent =
                                  ((evt.timestampMs - item.span.startMs) /
                                    spanDuration) *
                                  100

                                return (
                                  <div
                                    key={evtIdx}
                                    class="span-micro-event milestone-event"
                                    style={
                                      {
                                        '--event-offset-pct': `${Math.max(0, Math.min(relativePercent, 100))}%`,
                                      } as any
                                    }
                                  >
                                    <div class="event-tooltip">
                                      <div class="tooltip-title">
                                        {evt.name || 'Event'}
                                      </div>
                                      <div class="tooltip-time">
                                        {Math.round(
                                          evt.timestampMs - item.span.startMs,
                                        )}{' '}
                                        ms
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                              {item.span.logs?.map((log, logIdx) => {
                                const spanDuration = item.span.durationMs || 1
                                const relativePercent =
                                  ((log.timestampMs - item.span.startMs) /
                                    spanDuration) *
                                  100

                                return (
                                  <div
                                    key={`log-${logIdx}`}
                                    class={`span-micro-event log-event log-event-${log.level}`}
                                    style={
                                      {
                                        '--event-offset-pct': `${Math.max(0, Math.min(relativePercent, 100))}%`,
                                      } as any
                                    }
                                  >
                                    <div class="event-tooltip">
                                      <div class="tooltip-title">
                                        [{log.level}] {log.message}
                                      </div>
                                      <div class="tooltip-time">
                                        {Math.round(
                                          log.timestampMs - item.span.startMs,
                                        )}{' '}
                                        ms
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {selectedNode && (
                <InspectorDrawer
                  selectedNode={selectedNode}
                  onClose={() => setSelectedId(null)}
                />
              )}
            </div>

            <LogsPanel
              entries={flatLogEntries}
              highlightNodeId={selectedId}
              onSelectSpan={selectSpan}
            />
          </div>
        )}
      </div>
    </div>
  )
}

const mount = document.getElementById('app')
if (mount) {
  render(<PremiumTraceGantt />, mount)
}
