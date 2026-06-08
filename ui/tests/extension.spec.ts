import { test, expect } from '@playwright/test'

import {
  getExtensionId,
  launchExtensionContext,
  openPanel,
} from './helpers/extension'

test.describe('DevTrace Chrome extension', () => {
  test('registers a service worker and devtools page', async () => {
    const context = await launchExtensionContext()

    try {
      const extensionId = await getExtensionId(context)
      const page = await context.newPage()

      const devtoolsResponse = await page.goto(
        `chrome-extension://${extensionId}/devtools.html`,
      )
      expect(devtoolsResponse?.ok()).toBeTruthy()
    } finally {
      await context.close()
    }
  })

  test('panel loads content.js and renders the trace UI', async () => {
    const context = await launchExtensionContext()

    try {
      const extensionId = await getExtensionId(context)
      const page = await openPanel(context, extensionId)

      await expect(
        page.getByRole('heading', { name: 'Trace Cascading Tree Pipeline' }),
      ).toBeVisible()
      await expect(
        page.getByRole('heading', { name: 'Deep-Dive Gantt Timeline' }),
      ).toBeVisible()
      await expect(page.locator('.dashboard-wrapper')).toBeVisible()
      await expect(
        page.locator('.tree-node-name', { hasText: 'frontend' }),
      ).toBeVisible()
    } finally {
      await context.close()
    }
  })

  test('selecting a span opens the inspector drawer', async () => {
    const context = await launchExtensionContext()

    try {
      const extensionId = await getExtensionId(context)
      const page = await openPanel(context, extensionId)

      await page.locator('.tree-row', { hasText: 'frontend' }).first().click()

      await expect(
        page.getByRole('heading', { name: 'Execution Overview' }).first(),
      ).toBeVisible()
      await expect(
        page.locator('.inspector-drawer.is-visible').first(),
      ).toBeVisible()
    } finally {
      await context.close()
    }
  })
})
