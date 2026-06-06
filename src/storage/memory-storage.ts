import type { Span } from '@/core/span'

export class SpanStorage {
  private static spans: Span[] = []

  static add(span: Span) {
    SpanStorage.spans.push(span)
  }

  static getAll() {
    return SpanStorage.spans
  }

  static getRoots() {
    return SpanStorage.spans.filter((s: any) => !s.parentSpanId)
  }

  static clear() {
    SpanStorage.spans = []
  }
}
