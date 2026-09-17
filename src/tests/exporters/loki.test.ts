import { afterEach, describe, expect, it, vi } from 'vitest'

import type { SpanData } from '../../core/types'
import { LokiExporter } from '../../exporters/loki/loki.exporter'

const span: SpanData = {
  traceId: 'a'.repeat(32),
  id: 'b'.repeat(16),
  parentId: 'c'.repeat(16),
  name: 'checkout',
  timestamp: 1_700_000_000_000_000,
  localEndpoint: { serviceName: 'checkout-api' },
  tags: {
    'zentrace.logs': JSON.stringify([
      {
        level: 'info',
        message: 'payment accepted',
        fields: { orderId: 'order-1', total: 113 },
        ts: 1_700_000_000_123,
      },
      { level: 'error', message: 'receipt failed', ts: 1_700_000_000_456 },
    ]),
  },
}

describe('LokiExporter', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('pushes correlated JSON logs using low-cardinality labels', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    const exporter = new LokiExporter({
      endpoint: 'http://loki.test/loki/api/v1/push',
      tenantId: 'tenant-1',
      authToken: 'Bearer secret',
      labels: { environment: 'test' },
    })

    await exporter.export(span)

    expect(fetchMock).toHaveBeenCalledOnce()
    const [endpoint, init] = fetchMock.mock.calls[0]
    expect(endpoint).toBe('http://loki.test/loki/api/v1/push')
    expect(init.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer secret',
      'X-Scope-OrgID': 'tenant-1',
    })

    const payload = JSON.parse(init.body)
    expect(payload.streams).toHaveLength(2)
    expect(payload.streams[0].stream).toEqual({
      environment: 'test',
      service_name: 'checkout-api',
      level: 'info',
    })

    const [timestamp, rawLine] = payload.streams[0].values[0]
    expect(timestamp).toBe('1700000000123000000')
    expect(JSON.parse(rawLine)).toMatchObject({
      level: 'info',
      message: 'payment accepted',
      orderId: 'order-1',
      total: 113,
      trace_id: span.traceId,
      span_id: span.id,
      parent_span_id: span.parentId,
      span_name: 'checkout',
    })
  })

  it('nests dynamic payload under fields when nestFields is on', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    await new LokiExporter({ nestFields: true }).export(span)

    const payload = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(JSON.parse(payload.streams[0].values[0][1])).toEqual({
      timestamp: '2023-11-14T22:13:20.123Z',
      level: 'info',
      message: 'payment accepted',
      trace_id: span.traceId,
      span_id: span.id,
      parent_span_id: span.parentId,
      span_name: 'checkout',
      fields: { orderId: 'order-1', total: 113 },
    })
    expect(JSON.parse(payload.streams[1].values[0][1])).not.toHaveProperty(
      'fields',
    )
  })

  it('maps console.log to Loki info', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    await new LokiExporter().export({
      ...span,
      tags: {
        'zentrace.logs': JSON.stringify([
          { level: 'log', message: 'checkout started', ts: 1_700_000_000_123 },
        ]),
      },
    })

    const payload = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(payload.streams[0].stream.level).toBe('info')
    expect(JSON.parse(payload.streams[0].values[0][1]).level).toBe('info')
  })

  it('sends captureArgs/captureResult as structured input/output fields', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    await new LokiExporter().export({
      ...span,
      duration: 150_000,
      tags: {
        input: JSON.stringify(['demo-token']),
        output: JSON.stringify({ userId: 'user_123', roles: ['USER'] }),
        duration_ms: '150.2',
        module: 'auth',
      },
    })

    expect(fetchMock).toHaveBeenCalledOnce()
    const payload = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(payload.streams).toHaveLength(1)

    const [timestamp, rawLine] = payload.streams[0].values[0]
    // span.timestamp (us) + duration (us) → ms
    expect(timestamp).toBe('1700000000150000000')
    expect(JSON.parse(rawLine)).toMatchObject({
      level: 'info',
      message: 'checkout',
      event: 'span',
      input: ['demo-token'],
      output: { userId: 'user_123', roles: ['USER'] },
      duration_ms: 150.2,
      module: 'auth',
      trace_id: span.traceId,
      span_id: span.id,
      span_name: 'checkout',
    })
  })

  it('does not send spans without logs or captured I/O', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const exporter = new LokiExporter()

    await exporter.export({ ...span, tags: undefined })

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('throws on a failed Loki response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'unauthorized',
      }),
    )

    await expect(new LokiExporter().export(span)).rejects.toThrow(
      'Loki export failed (401): unauthorized',
    )
  })
})

describe('enableLokiExport', () => {
  afterEach(async () => {
    const { clearExporters } = await import('../../exporters/registry')
    clearExporters()
  })

  it('registers a Loki exporter and replaces an existing one', async () => {
    const { getExporters } = await import('../../exporters/registry')
    const { enableLokiExport, disableLokiExport } =
      await import('../../exporters/loki')

    enableLokiExport({ endpoint: 'http://a/loki/api/v1/push' })
    const second = enableLokiExport({
      endpoint: 'http://b/loki/api/v1/push',
    })

    expect(getExporters().size).toBe(1)
    expect([...getExporters()][0]).toBe(second)

    disableLokiExport()
    expect(getExporters().size).toBe(0)
  })
})
