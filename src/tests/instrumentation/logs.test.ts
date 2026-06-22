import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import { installLogCapture, uninstallLogCapture } from '@/instrumentation/logs'
import { trace } from '@/runtime/decorator/decorator'
import { SpanStorage } from '@/storage/memory-storage'

class LogService {
  @trace({ module: 'logs' })
  async run(message: string) {
    console.log(message)
    return message
  }

  @trace({ module: 'logs' })
  async nested(message: string) {
    return this.run(message)
  }
}

describe('log capture', () => {
  beforeEach(() => {
    SpanStorage.clear()
    installLogCapture()
  })

  afterEach(() => {
    uninstallLogCapture()
  })

  it('attaches console logs to the active span', async () => {
    const service = new LogService()
    await service.run('hello trace')

    const span = SpanStorage.getAll().find((item) => item.name === 'run')
    expect(
      span?.events.some((event) => event.value.includes('hello trace')),
    ).toBe(true)
  })

  it('attributes logs to the innermost span, not the parent', async () => {
    const service = new LogService()
    await service.nested('nested hello')

    const parent = SpanStorage.getAll().find((item) => item.name === 'nested')
    const child = SpanStorage.getAll().find((item) => item.name === 'run')

    expect(
      child?.events.some((event) => event.value.includes('nested hello')),
    ).toBe(true)
    expect(
      parent?.events.some((event) => event.value.includes('nested hello')),
    ).toBe(false)
  })

  it('captures logs that happen after an await', async () => {
    class DelayedLogService {
      @trace({ module: 'logs' })
      async run(message: string) {
        await new Promise((resolve) => setTimeout(resolve, 5))
        console.info(message)
        return message
      }
    }

    const service = new DelayedLogService()
    await service.run('after await')

    const span = SpanStorage.getAll().find((item) => item.name === 'run')
    expect(
      span?.events.some((event) => event.value.includes('after await')),
    ).toBe(true)
    expect(span?.attributes['devtrace.logs']).toContain('after await')
  })
})
