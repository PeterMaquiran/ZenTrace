import { describe, expect, it } from 'vitest'

import {
  parseStructuredValue,
  splitMessageWithStructuredSuffix,
  tokenizeLooseJson,
} from '../../../ui/parse-structured-value'

describe('parseStructuredValue', () => {
  it('parses strict JSON', () => {
    expect(parseStructuredValue('{"a":1}')).toEqual({ a: 1 })
  })

  it('parses JS object literals with single quotes', () => {
    expect(
      parseStructuredValue("{ endpoint: 'https://api.stripe.com/v3/charges' }"),
    ).toEqual({ endpoint: 'https://api.stripe.com/v3/charges' })
  })

  it('parses JS object literals with unquoted keys', () => {
    expect(
      parseStructuredValue("{ status: 'succeeded', chargeId: 'ch_3MxsY' }"),
    ).toEqual({ status: 'succeeded', chargeId: 'ch_3MxsY' })
  })
})

describe('splitMessageWithStructuredSuffix', () => {
  it('splits a text prefix from trailing JSON', () => {
    const split = splitMessageWithStructuredSuffix(
      'checkout completed {"orderId":"order-1781563072175","total":113}',
    )

    expect(split?.prefix).toBe('checkout completed')
    expect(split?.rawStructured).toBe(
      '{"orderId":"order-1781563072175","total":113}',
    )
    expect(split?.data).toEqual({
      orderId: 'order-1781563072175',
      total: 113,
    })
  })
})

describe('tokenizeLooseJson', () => {
  it('marks identifiers before colons as keys', () => {
    const tokens = tokenizeLooseJson("{ endpoint: 'x' }")
    expect(tokens.some((t) => t.type === 'key' && t.text === 'endpoint')).toBe(
      true,
    )
    expect(tokens.some((t) => t.type === 'string' && t.text === "'x'")).toBe(
      true,
    )
  })
})
