@trace() (decorator)
↓
propagation (extract/inject ctx)
↓
core/tracer (startSpan / endSpan)
↓
SpanData (normalized)
↓
exporters[]
├── ZenTrace UI
├── zipkin
├── otel
