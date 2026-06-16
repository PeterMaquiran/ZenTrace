import { createTraceSession, type TraceSession } from '../testing/session'

export type DevTraceTestInfo = {
  title: string
  file: string
  project?: { name?: string }
}

export type DevTracePage = {
  addInitScript: (
    script: (session: TraceSession) => void,
    session: TraceSession,
  ) => Promise<void>
}

/** Attach the current Playwright test identity to every root span in the page. */
export async function attachDevTrace(
  page: DevTracePage,
  testInfo: DevTraceTestInfo,
): Promise<TraceSession> {
  const session = createTraceSession({
    title: testInfo.title,
    file: testInfo.file,
    project: testInfo.project?.name,
  })

  await page.addInitScript((value) => {
    window.__DEVTRACE_SESSION__ = value
  }, session)

  return session
}

/** Inline script for Cypress `cy.visit({ onBeforeLoad })` or custom runners. */
export function devTraceSessionInitScript(session: TraceSession): string {
  return `window.__DEVTRACE_SESSION__=${JSON.stringify(session)};`
}

export function createSessionFromTestInfo(
  testInfo: DevTraceTestInfo,
): TraceSession {
  return createTraceSession({
    title: testInfo.title,
    file: testInfo.file,
    project: testInfo.project?.name,
  })
}

export type { TraceSession }
