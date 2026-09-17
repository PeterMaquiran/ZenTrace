export type SpanData = {
  traceId: string
  id: string
  parentId?: string | null
  name: string
  timestamp: number
  duration?: number
  localEndpoint: {
    serviceName: string
  }
  tags?: Record<string, string>
  /** Keys set with `span.setAttribute()` — Zipkin may send `input`/`output` only for these. */
  userAttributeKeys?: string[]
  annotations?: Array<{
    timestamp: number
    value: string
  }>
}
