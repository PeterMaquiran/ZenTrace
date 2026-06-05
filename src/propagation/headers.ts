import type { TraceContext } from '../core/context'

export function getTraceHeaders(ctx: TraceContext) {
  return {
    'x-trace-id': ctx.traceId,
    'x-span-id': ctx.spanId,
    'x-parent-id': ctx.parentId || '',
    traceparent: `00-${ctx.traceId}-${ctx.spanId}-01`,
  }
}
