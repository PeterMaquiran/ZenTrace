import { useRef } from 'preact/hooks'

import type { FlatLogEntry } from '../collect-logs'

import { LogMessage } from './LogMessage'
import '../style/LogsPanel.scss'

function LogLevelBadge({ level }: { level: FlatLogEntry['log']['level'] }) {
  return <span class={`log-level log-level-${level}`}>{level}</span>
}

function formatTraceTime(timestampMs: number): string {
  return `${Math.round(timestampMs)}ms`
}

type LogsPanelProps = {
  entries: FlatLogEntry[]
  highlightNodeId: string | null
  onSelectSpan?: (nodeId: string) => void
}

export function LogsPanel({
  entries,
  highlightNodeId,
  onSelectSpan,
}: LogsPanelProps) {
  const listRef = useRef<HTMLDivElement>(null)

  return (
    <section class="logs-panel" aria-label="Console logs">
      <div class="logs-panel-header">
        <h2>Console Logs</h2>
        <span class="logs-panel-count">
          {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      <div class="logs-panel-list" ref={listRef}>
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
              onClick={() => onSelectSpan?.(entry.nodeId)}
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
