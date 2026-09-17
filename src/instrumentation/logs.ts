import type { Span } from '../core/span.js'
import { captureStack, parseLogArgs } from '../core/stack.js'
import { emitTrace } from '../exporters/browser/browser-export.js'
import { resolveSpanFromStack } from '../runtime/active-context.js'
import { getCurrentSpan } from '../runtime/trace-runtime.js'

import { recordSpanLog } from './log-record.js'

export type ConsoleLevel = 'debug' | 'log' | 'info' | 'warn' | 'error'

const levels: ConsoleLevel[] = ['debug', 'log', 'info', 'warn', 'error']
const originals = new Map<ConsoleLevel, (...args: unknown[]) => void>()

let installed = false
let capturing = false

function resolveLogSpan(stack: string): Span | undefined {
  return getCurrentSpan() ?? resolveSpanFromStack(stack)
}

function emitSpanUpdate(span: Span) {
  // Live UI refresh only — exporters get the final span on completion.
  if (typeof window === 'undefined') return

  const durationMs = span.attributes.duration_ms
    ? Number(span.attributes.duration_ms)
    : undefined

  emitTrace(span.toJSON(durationMs ? durationMs * 1000 : undefined))
}

function attachLog(span: Span, level: ConsoleLevel, args: unknown[]) {
  const { message, fields } = parseLogArgs(args)
  recordSpanLog(span, level, message, fields)
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

/** Bypass log capture — used by span.console after it already recorded the log. */
export function callOriginalConsole(
  level: ConsoleLevel,
  args: unknown[],
): void {
  ensureConsolePatch()
  originals.get(level)?.(...args)
}
