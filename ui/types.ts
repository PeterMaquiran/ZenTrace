export type LogLevel = 'log' | 'info' | 'warn' | 'error'

export interface TraceLog {
  level: LogLevel
  message: string
  timestampMs: number
}

export interface TraceHttp {
  method: string
  url: string
  status?: number
  statusText?: string
}

export interface TraceEvent {
  name: string
  timestampMs: number
}

export interface TraceNode {
  name: string
  spanId?: string
  startMs: number
  durationMs: number
  colorHex: string
  input?: string
  output?: string
  events?: TraceEvent[]
  logs?: TraceLog[]
  http?: TraceHttp
  module?: string
  isHttp?: boolean
  children: TraceNode[]
}

export interface FlatRenderNode {
  span: TraceNode
  depth: number
  id: string
  parentId: string | null
  hasChildren: boolean
}

export interface TraceViewData {
  totalDurationMs: number
  rootSpan: TraceNode
}
