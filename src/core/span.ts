import { emitTrace } from '../exporters/browser/browser-export'
import { recordSpanLog } from '../instrumentation/log-record'
import type { ConsoleLevel } from '../instrumentation/logs'

import { TraceContext } from './context'
import { formatLogArgs } from './stack'
import type { SpanData } from './types'

export class Span {
  private startTime: number
  private endTime?: number

  public attributes: Record<string, string> = {}
  public events: Array<{ timestamp: number; value: string }> = []
  public children: Span[] = []

  constructor(
    public name: string,
    public serviceName: string,
    public context: TraceContext,
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

    const span = new Span(name, this.serviceName, childContext)

    this.children.push(span)
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

  get console(): Record<ConsoleLevel, (...args: unknown[]) => void> {
    const levels: ConsoleLevel[] = ['log', 'info', 'warn', 'error']

    const scoped: Partial<Record<ConsoleLevel, (...args: unknown[]) => void>> =
      {}

    for (const level of levels) {
      scoped[level] = (...args: unknown[]) => {
        const message = formatLogArgs(args)

        recordSpanLog(this as any, level, message)

        // Optional: also emit immediately
        const durationMs = this.attributes.duration_ms
          ? Number(this.attributes.duration_ms)
          : undefined

        emitTrace(this.toJSON(durationMs ? durationMs * 1000 : undefined))

        // still call real console
        ;(console as any)[level](...args)
      }
    }

    return scoped as Record<ConsoleLevel, (...args: unknown[]) => void>
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
