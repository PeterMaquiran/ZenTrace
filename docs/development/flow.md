@trace() (decorator)
↓
explicit parent Span (last argument, optional)
↓
core/tracer (startSpan / endSpan)
↓
SpanData (normalized)
↓
exporters[]
├── ZenTrace UI
├── zipkin
├── otel
