import { TraceContext } from '../core/context'

export function extract(headers: any) {
  if (!headers) return null

  const traceId = headers['x-trace-id']
  const spanId = headers['x-span-id']
  const parentId = headers['x-parent-id']

  if (!traceId || !spanId) return null

  return new TraceContext(traceId, spanId, parentId || null)
}
