@trace() (decorator)
↓
propagation (extract/inject ctx)
↓
core/tracer (startSpan / endSpan)
↓
SpanData (normalized)
↓
exporters[]
├── devtrace UI
├── zipkin
├── otel
