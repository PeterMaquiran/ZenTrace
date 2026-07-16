# 🚀 ZenTrace Core — Implementation Architecture

## 🧠 Goal

Design a tracing core that:

- ✅ Works out of the box (zero config)
- ✅ Uses explicit parent spans for deterministic propagation
- ✅ Is exporter-agnostic (Zipkin, Jaeger, OpenTelemetry, New Relic)
- ✅ Powers a local ZenTrace UI (no external dashboards required)

---

# 🧩 1. Core Principles

### 1. Separation of concerns

Split into 4 layers:

1. **Core (Tracing Engine)**
2. **Context Propagation**
3. **Exporters (pluggable)**
4. **UI Bridge (local ZenTrace UI)**

---

### 2. Open Standard First

Internally model spans using a **neutral format** compatible with:

- Zipkin
- OpenTelemetry
- Jaeger
- New Relic

👉 This avoids rewriting per exporter.

---

# 🧠 2. Core Domain Model

## SpanContext

Represents identity and propagation

- traceId (32 hex)
- spanId (16 hex)
- parentId (optional)

---

## Span

Represents a unit of work

Properties:

- name
- context
- startTime (high resolution)
- duration
- attributes (key-value)
- events (timeline annotations)
- status (ok | error)

Behavior:

- addAttribute()
- addEvent()
- recordError()
- end()

---

## Trace

Tree structure:

- traceId
- rootSpan
- children (nested spans)

---

# ⚙️ 3. Core Engine (Tracer)

## Responsibilities

- Start spans
- Link parent/child
- Manage lifecycle
- Notify exporters
- Notify UI

---

## API Design

### Start span

Parent-child relationships are created only from an explicitly supplied parent
span. A span without an explicit parent starts a new root trace.

---

### End span

- compute duration
- emit to:
  - exporters
  - UI bridge

---

## Important Rule

👉 **Core never knows about Zipkin or any backend**

It only emits:

```
SpanData (normalized)
```

---

# 🔗 4. Context Propagation

## Explicit propagation

- The parent `Span` is passed as the last argument.
- The decorator removes that parent from the user arguments and creates a child.
- Calls without a parent `Span` create independent root traces.

---

## Context Shape

Must be:

- serializable
- transportable via headers
- compatible with W3C Trace Context

---

## HTTP Propagation (standard)

Headers:

- traceparent (W3C)
- optional:
  - x-trace-id
  - x-span-id
  - x-parent-id

---

## Rule

If incoming request has headers:

👉 continue trace
Else:

👉 create new trace

---

# 📤 5. Exporter System (Pluggable)

## Interface

All exporters implement:

- export(span: SpanData)
- flush() (optional)

---

## Built-in Exporters

### 1. ZenTrace UI Exporter (default)

- sends spans to local UI (WebSocket or in-memory)
- zero config
- always enabled in dev

---

### 2. Zipkin Exporter

- transforms to Zipkin JSON
- POST /api/v2/spans

---

### 3. OpenTelemetry Exporter

- converts to OTLP format
- future-proof

---

### 4. Custom Exporter

User can implement:

- New Relic
- Datadog
- anything

---

## Multi-export Support

Allow:

```
exporters: [ZenTraceUI, zipkin, otel]
```

---

# 🖥️ 6. ZenTrace UI Bridge

## Purpose

Replace external dashboards.

---

## Responsibilities

- receive spans in real time
- build trace tree
- visualize:
  - call tree
  - timeline (waterfall)
  - arguments / results

---

## Transport Options

### Option A (simple)

- in-memory store
- UI reads from same process

### Option B (recommended)

- WebSocket server
- push spans live

---

## Data Format

Same normalized `SpanData`

---

# ⚡ 7. Normalized Span Format (IMPORTANT)

Everything converts from this:

```
SpanData {
  traceId
  spanId
  parentId
  name
  startTime
  duration
  attributes
  events
  status
  serviceName
}
```

---

## Why this matters

👉 One model → many exporters
👉 No lock-in
👉 Easy UI

---

# 🧩 8. Decorator Integration

## Responsibilities

- wrap function
- extract an explicitly supplied parent span or create a root
- start span
- supply the new span as the wrapped function's last argument
- end span on resolve/reject

---

## Rules

- a parent span, when supplied, is always the last call argument
- the wrapped function receives its own span as the last argument
- no parent is inferred from the call stack or async runtime

---

# ⚠️ 9. Performance Strategy

- no-op mode in production (optional)
- sampling support (future)
- lazy exporters
- batch sending (optional)

---

# 🛣️ 10. Execution Flow

### Function call

1. decorator runs
2. explicit parent extracted, or a root span created
3. span started
4. function executed
5. span ended
6. span sent to:
   - UI
   - exporters

---

# 🔥 11. Zero Config Experience

Out of the box:

- tracing works
- UI works
- no backend required

Optional:

- add Zipkin endpoint
- add OTEL collector
- add custom exporter

---

# 🧠 12. Future Extensions

- Browser support (fetch tracing)
- HTTP auto-instrumentation
- DB instrumentation
- trace replay
- flamegraphs

---

# 💡 Final Architecture Insight

This design gives you:

✅ Local-first debugging (ZenTrace UI)
✅ Industry compatibility (Zipkin / OTEL / Jaeger)
✅ Predictable explicit propagation
✅ Zero-config developer experience

---

# 🎯 Positioning

ZenTrace becomes:

> “The frontend of observability”

- ZenTrace UI → local understanding
- Exporters → production observability

---

# 🧠 Guiding Rule

> Core is simple. Everything else is a plugin.
