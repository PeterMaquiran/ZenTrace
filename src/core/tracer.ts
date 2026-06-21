import { TraceContext } from './context'
import { Span } from './span'

export class Tracer {
  constructor(private serviceName: string) {}

  startSpan(name: string, parent?: Span, module?: string) {
    const traceId = parent?.context.traceId || generateId(32)

    const spanId = generateId(16)
    const parentId = parent?.context.spanId || null

    const context = new TraceContext(traceId, spanId, parentId)

    const span = new Span(name, this.serviceName, context)

    if (module) span.addAttribute('module', module)

    return span
  }
}

/**
 * local util
 */
function generateId(length: number) {
  const hex = '0123456789abcdef'
  let out = ''

  for (let i = 0; i < length; i++) {
    out += hex[Math.floor(Math.random() * 16)]
  }

  return out
}
