export function inject(headers: any, ctx: any) {
  headers['x-trace-id'] = ctx.traceId
  headers['x-span-id'] = ctx.spanId
  headers['x-parent-id'] = ctx.parentId || ''
  headers['traceparent'] = `00-${ctx.traceId}-${ctx.spanId}-01`

  return headers
}
