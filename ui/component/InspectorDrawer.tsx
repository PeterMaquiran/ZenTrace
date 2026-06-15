import { Fragment } from 'preact'

import { httpStatusClass, extractLogs } from '../span-details'
import type { FlatRenderNode, TraceLog } from '../types'
import './../style/InspectorDrawers.scss'

import type { SpanData } from '../../src/core/types'

interface InspectorDrawerProps {
  selectedNode: FlatRenderNode | null
  liveSpans: SpanData[]
  traceStartUs: number
  onClose: () => void
}

function formatOffset(spanStartMs: number, eventMs: number): string {
  const relative = Math.max(0, Math.round(eventMs - spanStartMs))
  return `+${relative}ms`
}

function LogLevelBadge({ level }: { level: TraceLog['level'] }) {
  return <span class={`log-level log-level-${level}`}>{level}</span>
}

export function InspectorDrawer({
  selectedNode,
  liveSpans,
  traceStartUs,
  onClose,
}: InspectorDrawerProps) {
  const span = selectedNode?.span
  const rawSpan = span?.spanId
    ? liveSpans.find((item) => item.id === span.spanId)
    : undefined
  const logs: TraceLog[] = rawSpan
    ? extractLogs(rawSpan, traceStartUs)
    : (span?.logs ?? [])
  const http = span?.http
  const milestones = span?.events ?? []

  return (
    <Fragment>
      <div class={`inspector-drawer ${selectedNode ? 'is-visible' : ''}`}>
        {selectedNode && span && (
          <Fragment>
            <div class="drawer-header">
              <div class="drawer-title-box">
                <span
                  class="tree-node-badge"
                  style={{ backgroundColor: span.colorHex }}
                />
                <h3 class="drawer-title">{span.name}</h3>
                {span.isHttp && http && (
                  <span
                    class={`http-method-pill ${httpStatusClass(http.status)}`}
                  >
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
                <h4 class="section-heading">
                  Console Logs {logs.length > 0 ? `(${logs.length})` : ''}
                </h4>
                {logs.length > 0 ? (
                  <div class="drawer-logs-list">
                    {logs.map((log, idx) => (
                      <div
                        key={idx}
                        class={`drawer-log-item log-item-${log.level}`}
                      >
                        <div class="drawer-log-header">
                          <LogLevelBadge level={log.level} />
                          <span class="drawer-log-time">
                            {formatOffset(span.startMs, log.timestampMs)}
                          </span>
                        </div>
                        <pre class="drawer-log-message">{log.message}</pre>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span class="empty-state">
                    No console output captured for this span.
                  </span>
                )}
              </div>

              <div>
                <h4 class="section-heading">Input Arguments</h4>
                {span.input ? (
                  <pre class="code-payload">
                    <code>{span.input}</code>
                  </pre>
                ) : (
                  <span class="empty-state">No input arguments recorded.</span>
                )}
              </div>

              <div>
                <h4 class="section-heading">Output Result</h4>
                {span.output ? (
                  <pre class="code-payload">
                    <code>{span.output}</code>
                  </pre>
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
                  <span class="empty-state">
                    No lifecycle events for this span.
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
