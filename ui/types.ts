export interface TraceEvent {
  name: string
  timestampMs: number
}

export interface TraceNode {
  name: string
  startMs: number
  durationMs: number
  colorHex: string
  input?: string
  output?: string
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

export interface TraceViewData {
  totalDurationMs: number
  rootSpan: TraceNode
}
