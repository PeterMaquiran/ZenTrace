import { test, expect } from '@playwright/test'

import { attachDevTrace } from '../../src/playwright/index'

test.describe('DevTrace Playwright session', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await attachDevTrace(page, testInfo)
  })

  test('demo page exposes trace session for the active test', async ({
    page,
  }) => {
    await page.goto('/')

    const session = await page.evaluate(() => window.__DEVTRACE_SESSION__)
    expect(session?.title).toContain(
      'demo page exposes trace session for the active test',
    )
    expect(session?.file).toContain('playwright-integration.spec.ts')
  })
})
