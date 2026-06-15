import { render } from 'preact'
import { useEffect, useMemo, useState } from 'preact/hooks'

import type { SpanData } from '../src/core/types'

import { InspectorDrawer } from './component/InspectorDrawer'
import './listener'
import './devtools-bridge'
import { EXAMPLE_TRACE_DATA } from './example.data'
import './style/global.scss'
import { buildTraceView } from './trace-model'
import type { FlatRenderNode, TraceNode } from './types'

export type { FlatRenderNode, TraceEvent, TraceNode } from './types'

function PremiumTraceGantt() {
  const [liveSpans, setLiveSpans] = useState<SpanData[]>([])
  const rowHeight = 32

  useEffect(() => {
    return window.__TRACE__.subscribe((span) => {
      setLiveSpans((current) => {
        const next = [...current]
        const index = next.findIndex((item) => item.id === span.id)
        if (index === -1) next.push(span)
        else next[index] = span
        return next
      })
    })
  }, [])

  const isDevToolsPanel =
    typeof chrome !== 'undefined' && Boolean(chrome.devtools)

  const traceData = useMemo(() => {
    const live = buildTraceView(liveSpans)
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
  }, [isDevToolsPanel, liveSpans])

  const usingLiveTrace = liveSpans.length > 0
  const totalMs = traceData.totalDurationMs

  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>(
    {},
  )
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)

  // High-performance context selector node mapping state
  const [selectedNode, setSelectedNode] = useState<FlatRenderNode | null>(null)

  // Flatten structures
  const flatNodesList = useMemo(() => {
    const accumulator: FlatRenderNode[] = []
    const flattenTreeData = (
      node: TraceNode,
      depth = 0,
      parentId: string | null = null,
      path = '',
    ) => {
      const currentId = path ? `${path} -> ${node.name}` : node.name
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
    return accumulator
  }, [traceData])

  // Dynamic layout calculations
  const visibleNodesList = useMemo(() => {
    const list: FlatRenderNode[] = []
    for (const node of flatNodesList) {
      let isHidden = false
      let currentParentId = node.parentId
      while (currentParentId) {
        if (collapsedNodes[currentParentId]) {
          isHidden = true
          break
        }
        const parentNode = flatNodesList.find((n) => n.id === currentParentId)
        currentParentId = parentNode ? parentNode.parentId : null
      }
      if (!isHidden) list.push(node)
    }
    return list
  }, [flatNodesList, collapsedNodes])

  const totalCanvasHeightPx = `${visibleNodesList.length * rowHeight}px`

  const toggleCollapse = (id: string) => {
    setCollapsedNodes((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div class="dashboard-wrapper">
      {usingLiveTrace && (
        <p class="live-trace-banner">Live trace · {liveSpans.length} spans</p>
      )}
      <div class={`split-view-container ${selectedNode ? 'drawer-open' : ''}`}>
        {/* ==========================================================================
           LEFT PANEL: CASCADE TREE PIPELINE
           ========================================================================== */}
        <div class="tree-panel">
          <h2>Trace Cascading Tree Pipeline</h2>

          <div class="tree-scroll-container">
            <div class="tree-canvas" style={{ height: totalCanvasHeightPx }}>
              {visibleNodesList.map((item, index) => {
                const isCollapsed = collapsedNodes[item.id]
                const isHovered = hoveredNodeId === item.id
                const isSelected = selectedNode?.id === item.id

                return (
                  <div
                    key={`tree-${item.id}`}
                    class={`tree-row ${isHovered ? 'is-hovered' : ''} ${isSelected ? 'is-selected' : ''}`}
                    style={
                      {
                        '--row-index': index,
                        paddingLeft: `${item.depth * 14 + 12}px`,
                      } as any
                    }
                    onMouseEnter={() => setHoveredNodeId(item.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    onClick={() => setSelectedNode(item)}
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
                    </div>
                    <span class="tree-node-duration">
                      {item.span.durationMs}ms
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

          <div
            class="trace-axis-canvas"
            style={{ '--total-canvas-height': totalCanvasHeightPx } as any}
          >
            {/* ABSOLUTE CRITICAL PATH BRIDGES */}
            {visibleNodesList.map((item, index) => {
              if (item.parentId === null) return null

              const parentIndex = visibleNodesList.findIndex(
                (n) => n.id === item.parentId,
              )
              if (parentIndex === -1) return null

              const parentItem = visibleNodesList[parentIndex]
              const parentStartPct = (parentItem.span.startMs / totalMs) * 100
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

              const rowStyles = { '--row-index': index, 'z-index': '0' } as any

              const barStyles = {
                '--start-percent': `${leftPercent}%`,
                '--width-percent': `${Math.max(widthPercent, 1.5)}%`,
                '--bar-color': item.span.colorHex,
                '--bar-color-translucent': `${item.span.colorHex}26`,
              } as any

              return (
                <div
                  key={`bar-${item.id}`}
                  class={`timeline-row-wrapper ${isHovered ? 'is-hovered' : ''} ${isSelected ? 'is-selected' : ''}`}
                  style={rowStyles}
                  onMouseEnter={() => setHoveredNodeId(item.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  onClick={() => setSelectedNode(item)}
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
                              class="span-micro-event"
                              style={
                                {
                                  '--event-offset-pct': `${relativePercent}%`,
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
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ==========================================================================
         METADATA INSPECTION SIDE POPUP DRAWER
         ========================================================================== */}
      <div class={`inspector-drawer ${selectedNode ? 'is-visible' : ''}`}>
        {selectedNode && (
          <>
            <div class="drawer-header">
              <div class="drawer-title-box">
                <span
                  class="tree-node-badge"
                  style={{ backgroundColor: selectedNode.span.colorHex }}
                />
                <h3 class="drawer-title">{selectedNode.span.name}</h3>
              </div>
              <button
                class="close-drawer-btn"
                onClick={() => setSelectedNode(null)}
              >
                ×
              </button>
            </div>

            <div class="drawer-body">
              {/* Section 1: Core Performance Parameters */}
              <div>
                <h4 class="section-heading">Execution Overview</h4>
                <div class="meta-grid">
                  <div class="meta-row">
                    <span class="meta-key">Start Offset</span>
                    <span class="meta-val">{selectedNode.span.startMs} ms</span>
                  </div>
                  <div class="meta-row">
                    <span class="meta-key">Total Duration</span>
                    <span
                      class="meta-val"
                      style={{ color: selectedNode.span.colorHex }}
                    >
                      {selectedNode.span.durationMs} ms
                    </span>
                  </div>
                  <div class="meta-row">
                    <span class="meta-key">Hierarchy Depth</span>
                    <span class="meta-val">Level {selectedNode.depth}</span>
                  </div>
                </div>
              </div>

              {/* Section 2: Incoming Call Context JSON Payload */}
              <div>
                <h4 class="section-heading">Input Attributes (Arguments)</h4>
                {selectedNode.span.input ? (
                  <pre class="code-payload">
                    <code>{selectedNode.span.input}</code>
                  </pre>
                ) : (
                  <span class="empty-state">
                    No context arguments recorded for this runtime span
                    execution context layer.
                  </span>
                )}
              </div>

              {/* Section 3: Call Output Context / Responses */}
              <div>
                <h4 class="section-heading">
                  Output Result / Exception Returns
                </h4>
                {selectedNode.span.output ? (
                  <pre class="code-payload">
                    <code>{selectedNode.span.output}</code>
                  </pre>
                ) : (
                  <span class="empty-state">
                    No execution context output or logs captured.
                  </span>
                )}
              </div>

              {/* Section 4: Deep Chronological Milestones / Execution Spikes */}
              <div>
                <h4 class="section-heading">
                  Chronological Lifecycle Milestones
                </h4>
                {selectedNode.span.events &&
                selectedNode.span.events.length > 0 ? (
                  <div class="drawer-events-list">
                    {selectedNode.span.events.map((evt, idx) => (
                      <div key={idx} class="drawer-event-item">
                        <span class="drawer-event-name">{evt.name}</span>
                        <span class="drawer-event-time">
                          +{evt.timestampMs}ms
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span class="empty-state">
                    No timeline events or tracing signals emitted by this node.
                  </span>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* 3. Drop the Inspector Drawer directly into your layout hierarchy */}
      <InspectorDrawer
        selectedNode={selectedNode}
        setSelectedNode={setSelectedNode}
      />
    </div>
  )
}

const mount = document.getElementById('app')
if (mount) {
  render(<PremiumTraceGantt />, mount)
}
