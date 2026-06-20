import type { FlatLogEntry } from '../collect-logs'

import { LogMessage } from './LogMessage'

function LogLevelBadge({ level }: { level: FlatLogEntry['log']['level'] }) {
  return <span class={`log-level log-level-${level}`}>{level}</span>
}

function formatTraceTime(timestampMs: number): string {
  return `${Math.round(timestampMs)}ms`
}

type LogsPanelProps = {
  entries: FlatLogEntry[]
  highlightNodeId: string | null
}

export function LogsPanel({ entries, highlightNodeId }: LogsPanelProps) {
  return (
    <section class="logs-panel" aria-label="Console logs">
      <div class="logs-panel-header">
        <h2>Console Logs</h2>
        <span class="logs-panel-count">
          {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      <div class="logs-panel-list">
        {entries.length === 0 ? (
          <p class="logs-panel-empty">No console output captured yet.</p>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.entryId}
              data-span-node-id={entry.nodeId}
              class={`logs-panel-item log-item-${entry.log.level} ${
                highlightNodeId === entry.nodeId ? 'is-highlighted' : ''
              }`}
            >
              <div class="logs-panel-item-header">
                <div class="logs-panel-span">
                  <span
                    class="tree-node-badge"
                    style={{ backgroundColor: entry.colorHex }}
                  />
                  <span class="logs-panel-span-name">{entry.spanName}</span>
                </div>
                <div class="logs-panel-meta">
                  <LogLevelBadge level={entry.log.level} />
                  <span class="logs-panel-time">
                    {formatTraceTime(entry.log.timestampMs)}
                  </span>
                  <span class="logs-panel-offset">
                    +
                    {Math.max(
                      0,
                      Math.round(entry.log.timestampMs - entry.spanStartMs),
                    )}
                    ms
                  </span>
                </div>
              </div>
              <LogMessage message={entry.log.message} />
            </div>
          ))
        )}
      </div>
    </section>
  )
}
