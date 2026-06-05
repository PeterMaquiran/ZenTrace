import { TraceContext } from './context'
import type { SpanData } from './types'

export class Span {
  private startTime: number
  private endTime?: number

  public attributes: Record<string, string> = {}
  public events: Array<{ timestamp: number; value: string }> = []

  constructor(
    public name: string,
    public serviceName: string,
    public context: TraceContext,
    private exporter: any,
  ) {
    this.startTime = Date.now() * 1000
  }

  addAttribute(key: string, value: string) {
    this.attributes[key] = value
  }

  addEvent(value: string) {
    this.events.push({
      timestamp: Date.now() * 1000,
      value,
    })
  }

  child(name: string, module?: string) {
    const spanId = generateId(16)

    const childContext = TraceContext.child(this.context, spanId)

    const span = new Span(name, this.serviceName, childContext, this.exporter)

    if (module) span.addAttribute('module', module)

    return span
  }

  recordError(error: any, message?: string) {
    this.addAttribute('error', 'true')

    if (message) this.addEvent(`error.message: ${message}`)
    if (error) this.addEvent(`error: ${error?.message || String(error)}`)
  }

  async end() {
    this.endTime = Date.now() * 1000

    const duration = this.endTime - this.startTime

    await this.exporter.export(this.toJSON(duration))
  }

  toJSON(duration?: number): SpanData {
    return {
      traceId: this.context.traceId,
      id: this.context.spanId,
      parentId: this.context.parentId,
      name: this.name,
      timestamp: this.startTime,
      duration,
      localEndpoint: {
        serviceName: this.serviceName,
      },
      tags: Object.keys(this.attributes).length ? this.attributes : undefined,
      annotations: this.events.length ? this.events : undefined,
    }
  }

  getTraceHeaders() {
    return {
      'x-trace-id': this.context.traceId,
      'x-span-id': this.context.spanId,
      'x-parent-id': this.context.parentId || '',
      traceparent: `00-${this.context.traceId}-${this.context.spanId}-01`,
    }
  }
}

/**
 * Internal util (kept local in core MVP)
 */
function generateId(length: number) {
  const hex = '0123456789abcdef'
  let out = ''

  for (let i = 0; i < length; i++) {
    out += hex[Math.floor(Math.random() * 16)]
  }

  return out
}
