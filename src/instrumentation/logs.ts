import type { Span } from '../core/span'
import { captureStack, formatLogArgs } from '../core/stack'
import { emitTrace } from '../exporters/browser/browser-export'
import { resolveSpanFromStack } from '../runtime/active-context'
import { getCurrentSpan } from '../runtime/trace-runtime'

import { recordSpanLog } from './log-record'

export type ConsoleLevel = 'log' | 'info' | 'warn' | 'error'

const levels: ConsoleLevel[] = ['log', 'info', 'warn', 'error']
const originals = new Map<ConsoleLevel, (...args: unknown[]) => void>()

let installed = false
let capturing = false

function resolveLogSpan(stack: string): Span | undefined {
  return getCurrentSpan() ?? resolveSpanFromStack(stack)
}

function emitSpanUpdate(span: Span) {
  if (typeof window === 'undefined') return

  const durationMs = span.attributes.duration_ms
    ? Number(span.attributes.duration_ms)
    : undefined

  emitTrace(span.toJSON(durationMs ? durationMs * 1000 : undefined))
}

function attachLog(span: Span, level: ConsoleLevel, args: unknown[]) {
  const message = formatLogArgs(args)
  recordSpanLog(span, level, message)
  emitSpanUpdate(span)
}

function ensureConsolePatch() {
  if (installed) return

  for (const level of levels) {
    if (!originals.has(level)) {
      originals.set(level, console[level].bind(console))
    }

    console[level] = (...args: unknown[]) => {
      if (capturing) {
        originals.get(level)?.(...args)
        return
      }

      const stack = captureStack()

      capturing = true
      try {
        const span = resolveLogSpan(stack)
        if (span) attachLog(span, level, args)
      } finally {
        capturing = false
      }

      originals.get(level)?.(...args)
    }
  }
}

export function installLogCapture() {
  if (installed) return
  ensureConsolePatch()
  installed = true
}

export function uninstallLogCapture() {
  if (!installed) return

  for (const level of levels) {
    const original = originals.get(level)
    if (original) console[level] = original
  }

  originals.clear()
  installed = false
}
