import { httpStatusClass } from '../span-details'
import type { FlatRenderNode } from '../types'

import { JsonViewer } from './JsonViewer'
import './../style/InspectorDrawers.scss'

interface InspectorDrawerProps {
  selectedNode: FlatRenderNode
  onClose: () => void
}

function formatOffset(spanStartMs: number, eventMs: number): string {
  const relative = Math.max(0, Math.round(eventMs - spanStartMs))
  return `+${relative}ms`
}

export function InspectorDrawer({
  selectedNode,
  onClose,
}: InspectorDrawerProps) {
  const span = selectedNode.span
  const http = span.http
  const milestones = span.events ?? []

  return (
    <aside class="inspector-drawer is-visible span-panel">
      <div class="drawer-header">
        <div class="drawer-title-box">
          <span
            class="tree-node-badge"
            style={{ backgroundColor: span.colorHex }}
          />
          <h3 class="drawer-title">{span.name}</h3>
          {span.isHttp && http && (
            <span class={`http-method-pill ${httpStatusClass(http.status)}`}>
              {http.method}
            </span>
          )}
        </div>
        <button type="button" class="close-drawer-btn" onClick={onClose}>
          ×
        </button>
      </div>

      <div class="drawer-body">
        <div>
          <h4 class="section-heading">Execution Overview</h4>
          <div class="meta-grid">
            <div class="meta-row">
              <span class="meta-key">Start Offset</span>
              <span class="meta-val">{span.startMs} ms</span>
            </div>
            <div class="meta-row">
              <span class="meta-key">Total Duration</span>
              <span class="meta-val" style={{ color: span.colorHex }}>
                {span.durationMs} ms
              </span>
            </div>
            {span.module && (
              <div class="meta-row">
                <span class="meta-key">Module</span>
                <span class="meta-val">{span.module}</span>
              </div>
            )}
            <div class="meta-row">
              <span class="meta-key">Hierarchy Depth</span>
              <span class="meta-val">Level {selectedNode.depth}</span>
            </div>
          </div>
        </div>

        {http && (
          <div>
            <h4 class="section-heading">HTTP Request</h4>
            <div class="http-card">
              <div class="http-card-row">
                <span class="meta-key">Method</span>
                <span
                  class={`http-method-pill ${httpStatusClass(http.status)}`}
                >
                  {http.method}
                </span>
              </div>
              <div class="http-card-row http-url-row">
                <span class="meta-key">URL</span>
                <code class="http-url" title={http.url}>
                  {http.url}
                </code>
              </div>
              <div class="http-card-row">
                <span class="meta-key">Status</span>
                <span
                  class={`http-status-value ${httpStatusClass(http.status)}`}
                >
                  {http.status ?? '…'}
                  {http.statusText ? ` ${http.statusText}` : ''}
                </span>
              </div>
              <div class="http-card-row">
                <span class="meta-key">Duration</span>
                <span class="meta-val">{span.durationMs} ms</span>
              </div>
            </div>
          </div>
        )}

        <div>
          <h4 class="section-heading">Input Arguments</h4>
          {span.input ? (
            <JsonViewer value={span.input} collapseAfterDepth={1} />
          ) : (
            <span class="empty-state">No input arguments recorded.</span>
          )}
        </div>

        <div>
          <h4 class="section-heading">Output Result</h4>
          {span.output ? (
            <JsonViewer value={span.output} collapseAfterDepth={1} />
          ) : (
            <span class="empty-state">No output captured.</span>
          )}
        </div>

        <div>
          <h4 class="section-heading">
            Lifecycle Events{' '}
            {milestones.length > 0 ? `(${milestones.length})` : ''}
          </h4>
          {milestones.length > 0 ? (
            <div class="drawer-events-list">
              {milestones.map((evt, idx) => (
                <div key={idx} class="drawer-event-item">
                  <span class="drawer-event-name">{evt.name}</span>
                  <span class="drawer-event-time">
                    {formatOffset(span.startMs, evt.timestampMs)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <span class="empty-state">No lifecycle events for this span.</span>
          )}
        </div>
      </div>
    </aside>
  )
}
