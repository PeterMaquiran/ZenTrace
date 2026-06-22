import { describe, expect, it } from 'vitest'

import { extractLogs } from '../../../ui/span-details'
import type { SpanData } from '../../core/types'

describe('extractLogs', () => {
  it('does not duplicate logs stored in multiple span fields', () => {
    const span: SpanData = {
      id: 'checkout',
      name: 'runCheckout',
      timestamp: 1_000_000,
      duration: 500_000,
      annotations: [
        {
          timestamp: 1_050_000,
          value: '[info] checkout started order-1',
        },
        {
          timestamp: 1_200_000,
          value: '[log] checkout completed {"orderId":"order-1"}',
        },
      ],
      tags: {
        'log.info': 'checkout started order-1',
        'log.log': 'checkout completed {"orderId":"order-1"}',
        'zentrace.logs': JSON.stringify([
          {
            level: 'info',
            message: 'checkout started order-1',
            ts: 1_050,
          },
          {
            level: 'log',
            message: 'checkout completed {"orderId":"order-1"}',
            ts: 1_200,
          },
        ]),
      },
    }

    const logs = extractLogs(span, 1_000_000)

    expect(logs).toHaveLength(2)
    expect(logs.map((log) => log.message)).toEqual([
      'checkout started order-1',
      'checkout completed {"orderId":"order-1"}',
    ])
  })

  it('falls back to annotations when zentrace.logs is missing', () => {
    const span: SpanData = {
      id: 'auth',
      name: 'validateToken',
      timestamp: 2_000_000,
      annotations: [
        {
          timestamp: 2_010_000,
          value: '[log] validating token demo-token',
        },
      ],
    }

    const logs = extractLogs(span, 2_000_000)

    expect(logs).toEqual([
      {
        level: 'log',
        message: 'validating token demo-token',
        timestampMs: 10,
      },
    ])
  })
})
