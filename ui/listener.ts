import type { SpanData } from '../src/core/types'

type TraceListener = (data: SpanData) => void

class TraceBus {
  private listeners: Set<TraceListener> = new Set()

  subscribe(listener: TraceListener) {
    this.listeners.add(listener)

    // return unsubscribe function
    return () => {
      this.listeners.delete(listener)
    }
  }

  push(data: SpanData) {
    for (const listener of this.listeners) {
      try {
        listener(data)
      } catch (err) {
        console.error('Trace listener error:', err)
      }
    }
  }
}

// create singleton on window
const bus = new TraceBus()
window.__TRACE__ = bus
