ZenTrace/
├── package.json
├── tsconfig.json
├── README.md
├── src/
│
│ # 🧠 Core (engine — no external deps mindset)
│ ├── core/
│ │ ├── tracer.ts
│ │ ├── span.ts
│ │ ├── context.ts
│ │ ├── trace.ts
│ │ └── types.ts
│
│ # 🔗 Explicit context transport
│ ├── propagation/
│ │ ├── extract.ts # extract ctx from args
│ │ ├── inject.ts # inject ctx into args
│ │ ├── headers.ts # HTTP headers (traceparent, etc)
│ │ └── validators.ts # isTraceContext, guards
│
│ # 🧩 Decorators (DX layer)
│ ├── decorators/
│ │ └── trace.ts # @trace() implementation
│
│ # 📤 Exporters (pluggable)
│ ├── exporters/
│ │ ├── base.ts # Exporter interface
│ │ ├── zipkin/
│ │ │ ├── zipkin.exporter.ts
│ │ │ └── zipkin.transformer.ts
│ │ ├── otel/
│ │ │ ├── otel.exporter.ts
│ │ │ └── otel.transformer.ts
│ │ │
│ │ ├── ZenTrace/
│ │ │ ├── ZenTrace.exporter.ts # local UI bridge
│ │ │ └── websocket.ts # WS server/client
│ │ │
│ │ └── index.ts # export all exporters
│
│ # 🖥️ Dev UI bridge (local-first)
│ ├── ui/
│ │ ├── store.ts # in-memory trace store
│ │ ├── bridge.ts # push spans to UI
│ │ └── protocol.ts # message format
│
│ # ⚙️ Config (zero-config defaults)
│ ├── config/
│ │ ├── default.ts # default config
│ │ └── resolver.ts # merge user config
│
│ # ⚡ Utils
│ ├── utils/
│ │ ├── id.ts # generate trace/span IDs
│ │ ├── time.ts # high-res timing
│ │ ├── logger.ts # internal debug logs
│ │ └── safe.ts # safe JSON stringify, etc
│
│ # 🚀 Public API (entry point)
│ ├── index.ts # exports everything cleanly
│
│ # 🧪 (optional but recommended)
│ ├── testing/
│ │ └── mock-exporter.ts
│
