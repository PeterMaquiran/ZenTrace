import { describe, it, expect } from 'vitest'

import { extract } from '../../util/extract'

describe('Extract context', () => {
  it('should extract valid trace context', () => {
    const headers = {
      'x-trace-id': 'abc',
      'x-span-id': '123',
      'x-parent-id': '999',
    }

    const ctx = extract(headers)

    expect(ctx).not.toBeNull()
    expect(ctx?.traceId).toBe('abc')
    expect(ctx?.spanId).toBe('123')
    expect(ctx?.parentId).toBe('999')
  })
})
