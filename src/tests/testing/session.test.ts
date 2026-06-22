import { describe, expect, it } from 'vitest'

import {
  configureZenTrace,
  getZenTraceConfig,
  resetZenTraceConfig,
} from '../../testing/configure'
import {
  createTraceSession,
  extractTestMeta,
  SESSION_TAGS,
} from '../../testing/session'

describe('configureZenTrace', () => {
  it('enables arg capture by default in test mode', () => {
    resetZenTraceConfig()
    configureZenTrace({ testMode: true })

    expect(getZenTraceConfig().captureArgs).toBe(true)
    expect(getZenTraceConfig().captureResult).toBe(true)
  })
})

describe('extractTestMeta', () => {
  it('reads test metadata tags from a root span', () => {
    const meta = extractTestMeta({
      [SESSION_TAGS.testTitle]: 'checkout flow',
      [SESSION_TAGS.testFile]: 'tests/checkout.spec.ts',
      [SESSION_TAGS.testProject]: 'chromium',
    })

    expect(meta).toEqual({
      title: 'checkout flow',
      file: 'tests/checkout.spec.ts',
      project: 'chromium',
    })
  })
})

describe('createTraceSession', () => {
  it('creates a stable session shape for runners', () => {
    const session = createTraceSession({
      id: 'session-1',
      title: 'should checkout',
      file: 'checkout.spec.ts',
      project: 'chromium',
    })

    expect(session.id).toBe('session-1')
    expect(session.title).toBe('should checkout')
  })
})
