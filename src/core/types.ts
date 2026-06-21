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
  annotations?: Array<{
    timestamp: number
    value: string
  }>
}
