import { test, expect } from '@playwright/test'

import { attachZenTrace } from '../../src/playwright/index'

test.describe('ZenTrace Playwright session', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await attachZenTrace(page, testInfo)
  })

  test('demo page exposes trace session for the active test', async ({
    page,
  }) => {
    await page.goto('/')

    const session = await page.evaluate(() => window.__ZENTRACE_SESSION__)
    expect(session?.title).toContain(
      'demo page exposes trace session for the active test',
    )
    expect(session?.file).toContain('playwright-integration.spec.ts')
  })
})
