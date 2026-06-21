export class TraceContext {
  constructor(
    public traceId: string,
    public spanId: string,
    public parentId: string | null = null,
  ) {}

  static createRoot(traceId: string, spanId: string) {
    return new TraceContext(traceId, spanId, null)
  }

  static child(parent: TraceContext, spanId: string) {
    return new TraceContext(parent.traceId, spanId, parent.spanId)
  }
}
