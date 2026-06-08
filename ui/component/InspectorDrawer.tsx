import { Fragment } from 'preact'

import './../style/InspectorDrawers.scss'
import React from 'preact/compat'

import type { FlatRenderNode } from '../main'

interface InspectorDrawerProps {
  selectedNode: FlatRenderNode | null
  // This explicit signature supports both direct objects and functional updates
  setSelectedNode: (
    value:
      | FlatRenderNode
      | null
      | ((prevState: FlatRenderNode | null) => FlatRenderNode | null),
  ) => void
}

export function InspectorDrawer({
  selectedNode,
  setSelectedNode,
}: InspectorDrawerProps) {
  // Method to handle log output to console
  const handleShowLogs = () => {
    if (!selectedNode) return

    console.group(
      `%c[Trace Log] ${selectedNode.span.name}`,
      `color: ${selectedNode.span.colorHex || '#00d4ff'}; font-weight: bold;`,
    )
    console.log('Execution Depth:', `Level ${selectedNode.depth}`)
    console.log('Start Offset:', `${selectedNode.span.startMs}ms`)
    console.log('Total Duration:', `${selectedNode.span.durationMs}ms`)

    try {
      console.log(
        'Input Parameters:',
        selectedNode.span.input ? JSON.parse(selectedNode.span.input) : 'None',
      )
    } catch {
      console.log('Input Parameters (Raw):', selectedNode.span.input || 'None')
    }

    try {
      console.log(
        'Output Context:',
        selectedNode.span.output
          ? JSON.parse(selectedNode.span.output)
          : 'None',
      )
    } catch {
      console.log('Output Context (Raw):', selectedNode.span.output || 'None')
    }

    if (selectedNode.span.events && selectedNode.span.events.length > 0) {
      console.table(selectedNode.span.events)
    }
    console.groupEnd()
  }

  return (
    <Fragment>
      <div class={`inspector-drawer ${selectedNode ? 'is-visible' : ''}`}>
        {selectedNode && (
          <Fragment>
            <div class="drawer-header">
              <div class="drawer-title-box">
                <span
                  class="tree-node-badge"
                  style={{ backgroundColor: selectedNode.span.colorHex }}
                />
                <h3 class="drawer-title">{selectedNode.span.name}</h3>
              </div>
              <button
                type="button"
                class="close-drawer-btn"
                onClick={() => setSelectedNode(null)}
              >
                ×
              </button>
            </div>

            <div class="drawer-body">
              {/* Section 1: Core Performance Parameters */}
              <div>
                <div class="section-header-row">
                  <h4 class="section-heading">Execution Overview</h4>
                  <button
                    type="button"
                    class="show-logs-btn"
                    onClick={handleShowLogs}
                  >
                    View Logs
                  </button>
                  <button
                    type="button"
                    class="show-logs-btn"
                    onClick={handleShowLogs}
                  >
                    View http request
                  </button>
                </div>
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
          </Fragment>
        )}
      </div>
    </Fragment>
  )
}
