import type { TraceSummary } from '../trace-model'

type TraceListPanelProps = {
  traces: TraceSummary[]
  selectedRootId?: string | null
  traceStartUs: number
  onSelectTrace: (rootId: string) => void
  layout?: 'sidebar' | 'full'
}

function formatTraceTime(timestampUs: number, traceStartUs: number): string {
  if (!traceStartUs) {
    return new Date(timestampUs / 1000).toLocaleTimeString()
  }

  const offsetMs = Math.round((timestampUs - traceStartUs) / 1000)
  return offsetMs >= 0 ? `+${offsetMs}ms` : `${offsetMs}ms`
}

export function TraceListPanel({
  traces,
  selectedRootId = null,
  traceStartUs,
  onSelectTrace,
  layout = 'sidebar',
}: TraceListPanelProps) {
  const isFull = layout === 'full'

  return (
    <section
      class={`trace-list-panel ${isFull ? 'trace-list-panel--full' : ''}`}
      aria-label="Trace list"
    >
      <div class="trace-list-header">
        <div>
          <h2>{isFull ? 'Select a trace' : 'Traces'}</h2>
          {isFull ? (
            <p class="trace-list-subtitle">
              Choose a trace to open the span tree and Gantt timeline.
            </p>
          ) : null}
        </div>
        <span class="trace-list-count">{traces.length}</span>
      </div>

      <div
        class={`trace-list-scroll ${isFull ? 'trace-list-scroll--full' : ''}`}
      >
        {traces.length === 0 ? (
          <p class="trace-list-empty">
            {isFull
              ? 'Waiting for traces… Run your app or Playwright test to capture spans.'
              : 'Run your app to capture traces.'}
          </p>
        ) : (
          traces
            .filter((trace) => !trace.name.startsWith('HTTP'))
            .map((trace) => {
              const isActive = trace.rootId === selectedRootId

              return (
                <button
                  key={trace.rootId}
                  type="button"
                  class={`trace-list-item ${isActive ? 'is-active' : ''}`}
                  onClick={() => onSelectTrace(trace.rootId)}
                >
                  <div class="trace-list-item-body">
                    <div class="trace-list-item-top">
                      <span class="trace-list-name">{trace.name}</span>
                    </div>
                    <div class="trace-list-item-meta">
                      <span>
                        {formatTraceTime(trace.timestampUs, traceStartUs)}
                      </span>
                      <span>{trace.spanCount} spans</span>
                      <span>{Math.round(trace.durationMs)}ms</span>
                    </div>
                    {trace.testTitle ? (
                      <div class="trace-list-test" title={trace.testTitle}>
                        {trace.testTitle}
                      </div>
                    ) : null}
                    {trace.hasError ? (
                      <span class="trace-list-error">Failed</span>
                    ) : null}
                  </div>
                  <div class="trace-list-item-trailing">
                    <span class="trace-list-chevron" aria-hidden="true">
                      ›
                    </span>
                  </div>
                </button>
              )
            })
        )}
      </div>
    </section>
  )
}
