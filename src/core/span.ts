import { emitTrace } from '../exporters/browser/browser-export.js'
import { recordSpanLog } from '../instrumentation/log-record.js'
import {
  callOriginalConsole,
  type ConsoleLevel,
} from '../instrumentation/logs.js'
import { writeStructuredLog } from '../logger.js'

import { TraceContext } from './context.js'
import { parseLogArgs } from './stack.js'
import type { SpanData } from './types.js'

export class Span {
  private startTime: number
  private endTime?: number

  public attributes: Record<string, string> = {}
  public events: Array<{ timestamp: number; value: string }> = []
  public children: Span[] = []
  private userAttributeKeys = new Set<string>()

  constructor(
    public name: string,
    public serviceName: string,
    public context: TraceContext,
  ) {
    this.startTime = Date.now() * 1000
  }

  /** Internal / captured tags (Loki, DevTools). Not treated as Zipkin user tags. */
  addAttribute(key: string, value: string) {
    this.attributes[key] = value
  }

  /**
   * User-set Zipkin tag. Captured `input` / `output` are never sent to Zipkin
   * unless you set those keys here.
   */
  setAttribute(key: string, value: unknown) {
    this.attributes[key] = toAttributeString(value)
    this.userAttributeKeys.add(key)
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
      // Zipkin (and UI) expect integer microseconds — performance.now() is float.
      duration: duration === undefined ? undefined : Math.round(duration),
      localEndpoint: {
        serviceName: this.serviceName,
      },
      tags: Object.keys(this.attributes).length ? this.attributes : undefined,
      userAttributeKeys:
        this.userAttributeKeys.size > 0
          ? [...this.userAttributeKeys]
          : undefined,
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
    const levels: ConsoleLevel[] = ['debug', 'log', 'info', 'warn', 'error']

    const scoped: Partial<Record<ConsoleLevel, (...args: unknown[]) => void>> =
      {}

    for (const level of levels) {
      scoped[level] = (...args: unknown[]) => {
        const { message, fields } = parseLogArgs(args)

        recordSpanLog(this as any, level, message, fields)

        if (typeof window !== 'undefined') {
          const durationMs = this.attributes.duration_ms
            ? Number(this.attributes.duration_ms)
            : undefined

          // Live UI refresh only — exporters get the final span on completion.
          emitTrace(this.toJSON(durationMs ? durationMs * 1000 : undefined))
        }

        const loggerLevel = level === 'log' ? 'info' : level
        const handled = writeStructuredLog(loggerLevel, message, this, fields)

        // Bypass the log-capture patch — this log is already on this span.
        if (!handled) callOriginalConsole(level, args)
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

function toAttributeString(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}
