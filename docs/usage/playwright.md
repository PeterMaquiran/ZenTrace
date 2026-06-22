# Playwright integration

ZenTrace correlates browser spans with the active Playwright test and surfaces
args, timing, logs, and HTTP calls in the DevTools panel.

## 1. Enable tracing in the app under test

```ts
import { configureZenTrace, enableAutoTracing } from 'zentrace'

configureZenTrace({ testMode: true })
enableAutoTracing({ logs: true, http: true })
```

`testMode` turns on `@trace({ captureArgs: true, captureResult: true })` by
default so the inspector shows function arguments and return values.

## 2. Attach the current test to each trace

```ts
import { test } from '@playwright/test'
import { attachZenTrace } from 'zentrace/playwright'

test.beforeEach(async ({ page }, testInfo) => {
  await attachZenTrace(page, testInfo)
})
```

Root spans receive these tags:

- `zentrace.test.title`
- `zentrace.test.file`
- `zentrace.test.project`
- `zentrace.session.id`

The ZenTrace toolbar displays the active test name and file.

## 3. Open the ZenTrace panel

1. Load the ZenTrace Chrome extension (`pnpm build:extension`).
2. Run your Playwright test with a headed browser (`headless: false` is required
   for extensions today).
3. Open Chrome DevTools on the page under test.
4. Select the **ZenTrace** panel.

## 4. Debug workflow

| Goal                         | UI                           |
| ---------------------------- | ---------------------------- |
| See call tree + durations    | Trace Cascading Tree         |
| Compare span timing          | Deep-Dive Gantt Timeline     |
| Inspect args / return values | Select span → Input / Output |
| Follow console output        | Console Logs panel (bottom)  |
| Find failures                | Toolbar → **Errors** filter  |
| Find slow spans              | Toolbar → **Slow** filter    |

Use **Clear trace** between tests to reset the panel.

## Cypress

Cypress can set the same session object before the app loads:

```ts
import {
  createSessionFromTestInfo,
  zenTraceSessionInitScript,
} from 'zentrace/playwright'

const session = createSessionFromTestInfo({
  title: 'checkout completes',
  file: 'cypress/e2e/checkout.cy.ts',
})

cy.visit('/checkout', {
  onBeforeLoad(win) {
    win.eval(zenTraceSessionInitScript(session))
  },
})
```

## Example repo scripts

```bash
pnpm build:extension   # bundle panel + content bridge
pnpm dev:demo          # instrumented checkout demo
pnpm test:extension    # Playwright extension smoke tests
pnpm test:package      # unit tests for trace engine + UI helpers
```
