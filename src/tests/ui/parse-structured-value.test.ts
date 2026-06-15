import { describe, expect, it } from 'vitest'

import {
  parseStructuredValue,
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
