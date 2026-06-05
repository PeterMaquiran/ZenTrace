# 🚀 DevTrace Core — Implementation Architecture

## 🧠 Goal

Design a tracing core that:

- ✅ Works out of the box (zero config)
- ✅ Supports manual + automatic propagation
- ✅ Is exporter-agnostic (Zipkin, Jaeger, OpenTelemetry, New Relic)
- ✅ Powers a local DevTrace UI (no external dashboards required)

---

# 🧩 1. Core Principles

### 1. Separation of concerns

Split into 4 layers:

1. **Core (Tracing Engine)**
2. **Context Propagation**
3. **Exporters (pluggable)**
4. **UI Bridge (local DevTrace UI)**

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

Supports both:

- implicit parent (via context)
- explicit parent (manual propagation)

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

## Modes

### 1. Automatic (default)

- decorator handles everything
- no developer involvement

---

### 2. Manual (advanced)

- `traceCtx` passed as last argument
- reused across boundaries

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

### 1. DevTrace UI Exporter (default)

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
exporters: [devtraceUI, zipkin, otel]
```

---

# 🖥️ 6. DevTrace UI Bridge

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
- extract or create context
- start span
- inject updated context
- end span on resolve/reject

---

## Rules

- context is always last argument
- new span = new context
- parent-child preserved

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
2. context extracted or created
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

- AsyncLocalStorage fallback (Node)
- Browser support (fetch tracing)
- HTTP auto-instrumentation
- DB instrumentation
- trace replay
- flamegraphs

---

# 💡 Final Architecture Insight

This design gives you:

✅ Local-first debugging (DevTrace UI)
✅ Industry compatibility (Zipkin / OTEL / Jaeger)
✅ Manual + automatic propagation
✅ Zero-config developer experience

---

# 🎯 Positioning

DevTrace becomes:

> “The frontend of observability”

- DevTrace UI → local understanding
- Exporters → production observability

---

# 🧠 Guiding Rule

> Core is simple. Everything else is a plugin.
