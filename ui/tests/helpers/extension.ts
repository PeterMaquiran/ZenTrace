import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium, type BrowserContext } from '@playwright/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const extensionPath = path.resolve(__dirname, '../../../extension')

export function createUserDataDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'devtrace-pw-'))
}

export async function launchExtensionContext(): Promise<BrowserContext> {
  return chromium.launchPersistentContext(createUserDataDir(), {
    channel: 'chromium',
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  })
}

export async function getExtensionId(context: BrowserContext): Promise<string> {
  let [serviceWorker] = context.serviceWorkers()
  if (!serviceWorker) {
    serviceWorker = await context.waitForEvent('serviceworker')
  }

  const extensionId = serviceWorker.url().split('/')[2]
  if (!extensionId) {
    throw new Error('Could not resolve extension ID from service worker URL')
  }

  return extensionId
}

export async function openPanel(context: BrowserContext, extensionId: string) {
  const page = await context.newPage()
  await page.goto(`chrome-extension://${extensionId}/panel.html`)
  return page
}
