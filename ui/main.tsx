import { render } from 'preact'
import { useState, useMemo } from 'preact/hooks'

import { InspectorDrawer } from './component/InspectorDrawer'
import './style/global.scss'
export interface TraceEvent {
  name: string
  timestampMs: number
}

export interface TraceNode {
  name: string
  startMs: number
  durationMs: number
  colorHex: string
  input?: string // Structured stringified JSON input payloads
  output?: string // Response payload parameters strings
  events?: TraceEvent[]
  children: TraceNode[]
}

export interface FlatRenderNode {
  span: TraceNode
  depth: number
  id: string
  parentId: string | null
  hasChildren: boolean
}

const ASSET_TRACE_DATA = {
  totalDurationMs: 255, // Fixed to fit the maximum boundary child node safely
  rootSpan: {
    name: 'frontend',
    startMs: 0,
    durationMs: 255, // Expanded to contain all downstream asynchronous cascades
    colorHex: '#4caf50',
    input: JSON.stringify(
      {
        orderId: '88231',
        expressShipping: true,
        customerId: 'usr_99x77a2',
        items: [
          { sku: 'SKU-882', qty: 2, price: 49.99 },
          { sku: 'SKU-104', qty: 1, price: 9.5 },
        ],
        metadata: {
          clientIp: '192.168.1.1',
          gateway: 'stripe_v3',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        },
      },
      null,
      2,
    ),
    output:
      "Order accepted successfully. Job dispatched to background worker queue 'high_priority'.",
    events: [
      { name: 'DOMReady', timestampMs: 15 },
      { name: 'FetchAuthStarted', timestampMs: 25 },
    ],
    children: [
      {
        name: 'auth',
        startMs: 25,
        durationMs: 225, // Wraps around everything it orchestrates downstream
        colorHex: '#ffb300',
        input: JSON.stringify(
          { tokenType: 'Bearer', scope: 'write:orders' },
          null,
          2,
        ),
        output: "Token decoded. Valid session sub='peter_mq'.",
        events: [
          { name: 'CacheMiss', timestampMs: 30 },
          { name: 'DecryptToken', timestampMs: 55 },
        ],
        children: [
          {
            name: 'internal',
            startMs: 60,
            durationMs: 190, // Wraps inside parent auth context bounds
            colorHex: '#4caf50',
            children: [
              {
                name: 'payment-gateway',
                startMs: 75,
                durationMs: 175, // 75 + 175 = 250ms (inside internal's 250ms absolute cap)
                colorHex: '#f44336',
                input: JSON.stringify(
                  { amount: 109.48, currency: 'USD' },
                  null,
                  2,
                ),
                events: [{ name: 'DBConnectionPoolLock', timestampMs: 80 }],
                children: [
                  {
                    name: 'ProcessAuthorization',
                    startMs: 85,
                    durationMs: 160, // 85 + 160 = 245ms
                    colorHex: '#f44336',
                    events: [{ name: 'GCRun_Spike', timestampMs: 135 }],
                    children: [
                      {
                        name: 'external-call',
                        startMs: 220,
                        durationMs: 25, // 220 + 25 = 245ms (perfectly fits inside parent)
                        colorHex: '#f44336',
                        input:
                          "{ endpoint: 'https://api.stripe.com/v3/charges' }",
                        output: "{ status: 'succeeded', chargeId: 'ch_3MxsY' }",
                        children: [],
                      },
                    ],
                  },
                  {
                    name: 'ext_request',
                    startMs: 90,
                    durationMs: 155, // 90 + 155 = 245ms
                    colorHex: '#f44336',
                    children: [
                      {
                        name: 'nested-auth-verify',
                        startMs: 95,
                        durationMs: 40, // 95 + 40 = 135ms
                        colorHex: '#ffb300',
                        input: JSON.stringify(
                          { tokenType: 'Bearer', scope: 'write:orders' },
                          null,
                          2,
                        ),
                        output: 'Token verified via sidecar sync check.',
                        events: [
                          { name: 'CacheMiss', timestampMs: 100 },
                          { name: 'DecryptToken', timestampMs: 120 },
                        ],
                        children: [
                          {
                            name: 'internal-cache-lookup',
                            startMs: 105,
                            durationMs: 15, // 105 + 15 = 120ms
                            colorHex: '#4caf50',
                            children: [
                              {
                                name: 'redis-cluster-ping',
                                startMs: 110,
                                durationMs: 10, // 110 + 10 = 120ms
                                colorHex: '#f44336',
                                input: JSON.stringify(
                                  { clusterNode: 'redis_node_01' },
                                  null,
                                  2,
                                ),
                                events: [
                                  {
                                    name: 'CacheHitConfirmed',
                                    timestampMs: 115,
                                  },
                                ],
                                children: [],
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    name: 'external-call-secondary',
                    startMs: 220,
                    durationMs: 25, // 220 + 25 = 245ms
                    colorHex: '#f44336',
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
}

function PremiumTraceGantt() {
  const totalMs = ASSET_TRACE_DATA.totalDurationMs
  const rowHeight = 32

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
    flattenTreeData(ASSET_TRACE_DATA.rootSpan)
    return accumulator
  }, [])

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
