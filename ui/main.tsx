import { render } from 'preact'
import { useEffect, useMemo, useRef, useState, useCallback } from 'preact/hooks'

import type { SpanData } from '../src/core/types'

import { collectFlatLogs } from './collect-logs'
import { InspectorDrawer } from './components/InspectorDrawer'
import { LogsPanel } from './components/LogsPanel'
import { PanelResizeHandle } from './components/PanelResizeHandle'
import { TraceListPanel } from './components/TraceListPanel'
import { TraceToolbar } from './components/TraceToolbar'
import { EXAMPLE_TRACE_DATA } from './example.data'
import { scrollRowIntoView, useSyncedScroll } from './hooks/use-synced-scroll'
import './listener'
import './devtools-bridge'
import './styles/global.scss'
import { mergeSpanUpdate } from './merge-span'
import { httpStatusClass } from './span-details'
import {
  formatTracePercent,
  resolveTimelineTotalMs,
  spanTimelineMetrics,
} from './timeline-metrics'
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
  const [spanSearch, setSpanSearch] = useState('')
  const [logsPanelRatio, setLogsPanelRatio] = useState(38)
  const [screen, setScreen] = useState<'picker' | 'detail'>('picker')

  const treeScrollRef = useRef<HTMLDivElement>(null)
  const ganttScrollRef = useRef<HTMLDivElement>(null)
  const detailLayoutRef = useRef<HTMLDivElement>(null)

  const hasLiveTraces = liveSpans.some((span) => !span.parentId)
  const showPicker = hasLiveTraces && screen === 'picker'

  // Flatten structures
  const { flatNodesList, timelineTotalMs } = useMemo(() => {
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

    const timelineTotalMs = resolveTimelineTotalMs(
      accumulator,
      traceData.totalDurationMs,
    )

    return {
      flatNodesList: enrichNodesWithPerformance(
        accumulator,
        timelineTotalMs,
        Math.max(100, timelineTotalMs * 0.2),
      ),
      timelineTotalMs,
    }
  }, [traceData])

  const traceStats = useMemo(
    () => computeTraceStats(flatNodesList, timelineTotalMs),
    [flatNodesList, timelineTotalMs],
  )

  const filteredNodesList = useMemo(
    () => filterTraceNodes(flatNodesList, viewFilter),
    [flatNodesList, viewFilter],
  )

  const searchedNodesList = useMemo(() => {
    const query = spanSearch.trim().toLowerCase()
    if (!query) return filteredNodesList
    return filteredNodesList.filter((node) =>
      node.span.name.toLowerCase().includes(query),
    )
  }, [filteredNodesList, spanSearch])

  const selectedNode = useMemo(
    () => flatNodesList.find((node) => node.id === selectedId) ?? null,
    [flatNodesList, selectedId],
  )

  // Dynamic layout calculations
  const visibleNodesList = useMemo(() => {
    const list: FlatRenderNode[] = []
    for (const node of searchedNodesList) {
      let isHidden = false
      let currentParentId = node.parentId
      while (currentParentId) {
        if (collapsedNodes[currentParentId]) {
          isHidden = true
          break
        }
        const parentNode = searchedNodesList.find(
          (n) => n.id === currentParentId,
        )
        currentParentId = parentNode ? parentNode.parentId : null
      }
      if (!isHidden) list.push(node)
    }
    return list
  }, [searchedNodesList, collapsedNodes])

  useSyncedScroll(treeScrollRef, ganttScrollRef, !showPicker)

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

  useEffect(() => {
    if (!selectedId || showPicker) return

    const rowIndex = visibleNodesList.findIndex(
      (node) => node.id === selectedId,
    )
    if (rowIndex === -1) return

    scrollRowIntoView(treeScrollRef.current, rowIndex, rowHeight)
    scrollRowIntoView(ganttScrollRef.current, rowIndex, rowHeight)
  }, [selectedId, showPicker, visibleNodesList, rowHeight])

  const selectTrace = (rootId: string) => {
    setActiveTraceRootId(rootId)
    setSelectedId(null)
    setViewFilter('all')
    setSpanSearch('')
    setScreen('detail')
  }

  const backToTraces = () => {
    setSelectedId(null)
    setSpanSearch('')
    setScreen('picker')
  }

  const selectSpan = useCallback(
    (nodeId: string) => {
      setSelectedId(nodeId)

      const node = flatNodesList.find((item) => item.id === nodeId)
      const spanId = node?.span.spanId
      if (!spanId) return

      const rawSpan = liveSpans.find((span) => span.id === spanId)
      if (rawSpan) {
        setActiveTraceRootId(findTraceRootId(rawSpan, liveSpans))
      }
    },
    [flatNodesList, liveSpans],
  )

  useEffect(() => {
    if (showPicker) return

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement
      ) {
        return
      }

      if (event.key === 'Escape') {
        setSelectedId(null)
        return
      }

      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
      if (visibleNodesList.length === 0) return

      event.preventDefault()

      const currentIndex = selectedId
        ? visibleNodesList.findIndex((node) => node.id === selectedId)
        : -1
      const delta = event.key === 'ArrowDown' ? 1 : -1
      const nextIndex = Math.min(
        visibleNodesList.length - 1,
        Math.max(0, currentIndex + delta),
      )

      selectSpan(visibleNodesList[nextIndex].id)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showPicker, selectedId, visibleNodesList, selectSpan])

  const clearTrace = () => {
    setLiveSpans([])
    setSelectedId(null)
    setActiveTraceRootId(null)
    setViewFilter('all')
    setSpanSearch('')
    setScreen('picker')
    knownRootCountRef.current = 0
  }

  const resizeLogsPanel = useCallback((deltaY: number) => {
    const layout = detailLayoutRef.current
    if (!layout) return

    setLogsPanelRatio((current) => {
      const next = current + (deltaY / layout.clientHeight) * 100
      return Math.min(62, Math.max(22, next))
    })
  }, [])

  const emptySpansMessage = useMemo(() => {
    if (spanSearch.trim()) {
      return `No spans match “${spanSearch.trim()}”.`
    }
    if (viewFilter === 'errors') {
      return 'No error spans in this trace.'
    }
    if (viewFilter === 'slow') {
      return 'No slow spans in this trace.'
    }
    return 'No spans to display.'
  }, [spanSearch, viewFilter])

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
        spanSearch={spanSearch}
        onSpanSearchChange={setSpanSearch}
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
          <div
            class="trace-screen-detail"
            ref={detailLayoutRef}
            style={
              {
                '--detail-main-ratio': `${100 - logsPanelRatio}%`,
                '--detail-logs-ratio': `${logsPanelRatio}%`,
              } as any
            }
          >
            <div
              class={`split-view-container ${selectedNode ? 'inspector-open' : ''}`}
            >
              <div class="tree-panel">
                <div class="panel-header">
                  <h2>
                    Span Tree
                    <span class="panel-count">{visibleNodesList.length}</span>
                  </h2>
                </div>

                <div class="tree-scroll-container" ref={treeScrollRef}>
                  {visibleNodesList.length === 0 ? (
                    <p class="panel-empty-state">{emptySpansMessage}</p>
                  ) : (
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
                            data-node-id={item.id}
                            role="button"
                            tabIndex={0}
                            aria-selected={isSelected}
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
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault()
                                selectSpan(item.id)
                              }
                            }}
                          >
                            {item.depth > 0 &&
                              Array.from({ length: item.depth }).map((_, i) => (
                                <div
                                  key={i}
                                  class="tree-line-vertical"
                                  style={{ left: `${i * 14 + 16}px` }}
                                />
                              ))}

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
                              <span class="tree-node-name">
                                {item.span.name}
                              </span>
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
                              {item.parentId
                                ? `${Math.trunc(item.span.durationMs)}ms`
                                : `${Math.trunc(timelineTotalMs)}ms`}
                              {item.span.percentOfTrace !== undefined ? (
                                <span class="tree-node-percent">
                                  {' '}
                                  (
                                  {item.parentId
                                    ? `${formatTracePercent(item.span.percentOfTrace)}`
                                    : '100'}
                                  %)
                                </span>
                              ) : null}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div class="gantt-panel">
                <div class="panel-header">
                  <h2>
                    Timeline
                    <span class="panel-count">{visibleNodesList.length}</span>
                    <div class="gantt-time-axis" aria-hidden="true">
                      <span>0ms</span>
                      <span>{Math.round(timelineTotalMs)}ms</span>
                    </div>
                  </h2>
                </div>

                <div
                  class="trace-axis-canvas"
                  ref={ganttScrollRef}
                  style={
                    { '--total-canvas-height': totalCanvasHeightPx } as any
                  }
                >
                  {visibleNodesList.length === 0 ? (
                    <p class="panel-empty-state">{emptySpansMessage}</p>
                  ) : (
                    <>
                      {visibleNodesList.map((item, index) => {
                        if (item.parentId === null) return null

                        const parentIndex = visibleNodesList.findIndex(
                          (n) => n.id === item.parentId,
                        )
                        if (parentIndex === -1) return null

                        const parentItem = visibleNodesList[parentIndex]
                        const parentStartPct = spanTimelineMetrics(
                          parentItem.span.startMs,
                          0,
                          timelineTotalMs,
                        ).leftPercent
                        const childStartPct = spanTimelineMetrics(
                          item.span.startMs,
                          0,
                          timelineTotalMs,
                        ).leftPercent

                        const isBridgeHighlighted = hoveredNodeId === item.id

                        return (
                          <div
                            key={`bridge-${item.id}`}
                            class={`trace-absolute-bridge ${isBridgeHighlighted ? 'highlight-bridge' : ''}`}
                            style={
                              {
                                '--bridge-left': `${parentStartPct}%`,
                                '--bridge-width': `${childStartPct - parentStartPct}%`,
                                '--parent-index': parentIndex,
                                '--child-index': index,
                              } as any
                            }
                          />
                        )
                      })}

                      {visibleNodesList.map((item, index) => {
                        const { leftPercent, widthPercent } =
                          spanTimelineMetrics(
                            item.span.startMs,
                            item.span.durationMs,
                            timelineTotalMs,
                          )
                        const isHovered = hoveredNodeId === item.id
                        const isSelected = selectedNode?.id === item.id

                        return (
                          <div
                            key={`bar-${item.id}`}
                            data-node-id={item.id}
                            role="button"
                            tabIndex={0}
                            aria-selected={isSelected}
                            class={`timeline-row-wrapper ${rowClassName(item, `${isHovered ? 'is-hovered' : ''} ${isSelected ? 'is-selected' : ''}`)}`}
                            style={
                              {
                                '--row-index': index,
                                'z-index': '0',
                              } as any
                            }
                            onMouseEnter={() => setHoveredNodeId(item.id)}
                            onMouseLeave={() => setHoveredNodeId(null)}
                            onClick={() => selectSpan(item.id)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault()
                                selectSpan(item.id)
                              }
                            }}
                          >
                            <div class="waterfall-track">
                              <div
                                class="waterfall-bar"
                                style={
                                  {
                                    '--start-percent': `${leftPercent}%`,
                                    '--width-percent': item.parentId
                                      ? `${widthPercent}%`
                                      : '100%',
                                    '--bar-color': item.span.colorHex,
                                    '--bar-color-translucent':
                                      item.span.colorHex.startsWith('#')
                                        ? `${item.span.colorHex}44`
                                        : item.span.colorHex.replace(
                                            ')',
                                            ' / 26%)',
                                          ),
                                  } as any
                                }
                              >
                                <span class="bar-label">{item.span.name}</span>
                                <div class="bar-events-container">
                                  {item.span.events?.map((evt, evtIdx) => {
                                    const spanDuration =
                                      item.span.durationMs || 1
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
                                              evt.timestampMs -
                                                item.span.startMs,
                                            )}{' '}
                                            ms
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  })}
                                  {item.span.logs?.map((log, logIdx) => {
                                    const spanDuration =
                                      item.span.durationMs || 1
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
                                              log.timestampMs -
                                                item.span.startMs,
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
                    </>
                  )}
                </div>
              </div>

              {selectedNode && (
                <InspectorDrawer
                  selectedNode={selectedNode}
                  onClose={() => setSelectedId(null)}
                />
              )}
            </div>

            <PanelResizeHandle onResize={resizeLogsPanel} />

            <LogsPanel entries={flatLogEntries} highlightNodeId={selectedId} />
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
