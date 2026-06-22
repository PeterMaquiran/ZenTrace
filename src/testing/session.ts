export type TraceSession = {
  id: string
  title: string
  file: string
  project?: string
}

export const SESSION_TAGS = {
  testTitle: 'zentrace.test.title',
  testFile: 'zentrace.test.file',
  testProject: 'zentrace.test.project',
  sessionId: 'zentrace.session.id',
} as const

export function setTraceSession(session: TraceSession): void {
  if (typeof window === 'undefined') return
  window.__ZENTRACE_SESSION__ = session
}

export function getTraceSession(): TraceSession | undefined {
  if (typeof window === 'undefined') return undefined
  return window.__ZENTRACE_SESSION__
}

export function clearTraceSession(): void {
  if (typeof window === 'undefined') return
  delete window.__ZENTRACE_SESSION__
}

export function createTraceSession(input: {
  title: string
  file: string
  project?: string
  id?: string
}): TraceSession {
  return {
    id: input.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: input.title,
    file: input.file,
    project: input.project,
  }
}

export function extractTestMeta(
  tags?: Record<string, string>,
): Pick<TraceSession, 'title' | 'file' | 'project'> | undefined {
  if (!tags) return undefined

  const title = tags[SESSION_TAGS.testTitle]
  const file = tags[SESSION_TAGS.testFile]
  const project = tags[SESSION_TAGS.testProject]

  if (!title && !file && !project) return undefined

  return {
    title: title ?? 'unknown test',
    file: file ?? '',
    project,
  }
}
