import type { ComponentChildren } from 'preact'

import type { TraceStats, TraceFilter } from '../trace-stats'
import { formatTestLabel } from '../trace-stats'
import type { TraceViewData } from '../types'

import '../style/TraceToolbar.scss'

type TraceToolbarProps = {
  usingLiveTrace: boolean
  mode: 'picker' | 'detail'
  testMeta?: TraceViewData['testMeta']
  stats?: TraceStats
  traceCount?: number
  filter?: TraceFilter
  onFilterChange?: (filter: TraceFilter) => void
  onBack?: () => void
  onClear: () => void
}

export function TraceToolbar({
  usingLiveTrace,
  mode,
  testMeta,
  stats,
  traceCount = 0,
  filter = 'all',
  onFilterChange,
  onBack,
  onClear,
}: TraceToolbarProps) {
  const testLabel = formatTestLabel(testMeta)
  const isPicker = mode === 'picker'

  return (
    <header class="trace-toolbar">
      <div class="trace-toolbar-primary">
        {onBack ? (
          <button type="button" class="trace-back-btn" onClick={onBack}>
            ← All traces
          </button>
        ) : null}
        <div class="trace-toolbar-brand">
          <span class="trace-toolbar-title">DevTrace</span>
          {usingLiveTrace ? (
            <span class="trace-toolbar-live">Live</span>
          ) : (
            <span class="trace-toolbar-sample">Sample</span>
          )}
        </div>
        {isPicker ? (
          <div class="trace-toolbar-test">
            {traceCount} trace{traceCount === 1 ? '' : 's'} captured
          </div>
        ) : null}
        {!isPicker && testLabel ? (
          <div class="trace-toolbar-test" title={testMeta?.file}>
            {testLabel}
            {testMeta?.project ? (
              <span class="trace-toolbar-project">{testMeta.project}</span>
            ) : null}
          </div>
        ) : null}
      </div>

      {!isPicker && stats ? (
        <div class="trace-toolbar-metrics">
          <Metric
            label="Duration"
            value={`${Math.round(stats.totalDurationMs)}ms`}
          />
          <Metric label="Spans" value={String(stats.spanCount)} />
          <Metric
            label="Errors"
            value={String(stats.errorCount)}
            tone={stats.errorCount > 0 ? 'danger' : 'default'}
          />
          <Metric
            label="P95"
            value={`${Math.round(stats.p95DurationMs)}ms`}
            tone="accent"
          />
          {stats.slowest ? (
            <Metric
              label="Slowest"
              value={`${stats.slowest.span.name} (${Math.round(stats.slowest.span.durationMs)}ms)`}
              tone="warn"
            />
          ) : null}
        </div>
      ) : null}

      <div class="trace-toolbar-actions">
        {!isPicker && onFilterChange ? (
          <div
            class="trace-filter-group"
            role="group"
            aria-label="Trace filters"
          >
            <FilterButton
              active={filter === 'all'}
              onClick={() => onFilterChange('all')}
            >
              All
            </FilterButton>
            <FilterButton
              active={filter === 'errors'}
              onClick={() => onFilterChange('errors')}
            >
              Errors
              {stats && stats.errorCount > 0 ? ` (${stats.errorCount})` : ''}
            </FilterButton>
            <FilterButton
              active={filter === 'slow'}
              onClick={() => onFilterChange('slow')}
            >
              Slow
            </FilterButton>
          </div>
        ) : null}
        <button
          type="button"
          class="trace-clear-btn"
          onClick={onClear}
          disabled={!usingLiveTrace}
        >
          Clear traces
        </button>
      </div>
    </header>
  )
}

function Metric({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: string
  tone?: 'default' | 'accent' | 'warn' | 'danger'
}) {
  return (
    <div class={`trace-metric trace-metric-${tone}`}>
      <span class="trace-metric-label">{label}</span>
      <span class="trace-metric-value">{value}</span>
    </div>
  )
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ComponentChildren
}) {
  return (
    <button
      type="button"
      class={`trace-filter-btn ${active ? 'is-active' : ''}`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
