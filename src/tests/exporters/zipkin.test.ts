import { afterEach, describe, expect, it, vi } from 'vitest'

import type { SpanData } from '../../core/types'
import {
  clearExporters,
  getExporters,
  registerExporter,
  replaceExporter,
} from '../../exporters/registry'
import { ZipkinExporter } from '../../exporters/zipkin/zipkin.exporter'

describe('ZipkinExporter', () => {
  afterEach(() => {
    clearExporters()
    vi.restoreAllMocks()
  })

  it('posts span JSON to the Zipkin v2 endpoint', async () => {
    const span: SpanData = {
      traceId: 'a'.repeat(32),
      id: 'b'.repeat(16),
      name: 'checkout',
      timestamp: 1_700_000_000_000_000,
      duration: 42_000,
      localEndpoint: { serviceName: 'demo' },
      tags: { module: 'checkout' },
    }

    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    const exporter = new ZipkinExporter({
      endpoint: 'http://zipkin.test/api/v2/spans',
      authToken: 'Bearer secret',
    })

    await exporter.export(span)

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock.mock.calls[0][0]).toBe('http://zipkin.test/api/v2/spans')
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer secret',
      },
    })
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual([
      {
        traceId: span.traceId,
        id: span.id,
        name: span.name,
        timestamp: span.timestamp,
        duration: span.duration,
        localEndpoint: span.localEndpoint,
        tags: span.tags,
      },
    ])
  })

  it('rounds float durations to integer microseconds for Zipkin', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    const exporter = new ZipkinExporter({
      endpoint: 'http://zipkin.test/api/v2/spans',
    })
    const floatTimestamp = Number.parseFloat('1700000000000000.7')

    await exporter.export({
      traceId: 'a'.repeat(32),
      id: 'b'.repeat(16),
      name: 'charge',
      timestamp: floatTimestamp,
      duration: 164_200.00000298023,
      localEndpoint: { serviceName: 'demo' },
    })

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string)
    expect(body[0].duration).toBe(164200)
    expect(body[0].timestamp).toBe(1_700_000_000_000_001)
    expect(Number.isInteger(body[0].duration)).toBe(true)
  })

  it('serializes the exact float from Zipkin error reports as an integer', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    const exporter = new ZipkinExporter({
      endpoint: 'http://zipkin.test/api/v2/spans',
    })

    await exporter.export({
      traceId: '19d8167e67ac9699a78eb62b570559d2',
      id: '2378205d61c495d5',
      parentId: '47d950b36aa4606a',
      name: 'processGateway',
      timestamp: 1784156836792000,
      duration: 101599.99999403954,
      localEndpoint: { serviceName: 'zentrace' },
      tags: { duration_ms: '101.59999999403954' },
    })

    const raw = fetchMock.mock.calls[0][1].body as string
    expect(raw).toContain('"duration":101600')
    expect(raw).not.toContain('101599.99999403954')
  })

  it('throws when Zipkin returns a non-2xx response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'server error',
    })
    vi.stubGlobal('fetch', fetchMock)

    const exporter = new ZipkinExporter({
      endpoint: 'http://zipkin.test/api/v2/spans',
    })

    await expect(
      exporter.export({
        traceId: 'a'.repeat(32),
        id: 'b'.repeat(16),
        name: 'fail',
        timestamp: 1,
        localEndpoint: { serviceName: 'demo' },
      }),
    ).rejects.toThrow('Zipkin export failed (500): server error')
  })
})

describe('exporter registry', () => {
  afterEach(() => {
    clearExporters()
  })

  it('registers exporters for dispatch', async () => {
    const exportMock = vi.fn().mockResolvedValue(undefined)
    registerExporter({ export: exportMock })

    expect(getExporters().size).toBe(1)
    await [...getExporters()][0].export({
      traceId: 'a'.repeat(32),
      id: 'b'.repeat(16),
      name: 'root',
      timestamp: 1,
      localEndpoint: { serviceName: 'demo' },
    })
    expect(exportMock).toHaveBeenCalledOnce()
  })

  it('replaceExporter drops previous exporters with the same id', () => {
    const first = new ZipkinExporter({ endpoint: 'http://a/api/v2/spans' })
    const second = new ZipkinExporter({ endpoint: 'http://b/api/v2/spans' })

    registerExporter(first)
    replaceExporter(second)

    expect(getExporters().size).toBe(1)
    expect([...getExporters()][0]).toBe(second)
  })
})
