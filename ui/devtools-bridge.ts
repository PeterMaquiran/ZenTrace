import './listener'

import type { SpanData } from '../src/core/types'

declare const chrome: typeof globalThis.chrome

function isDevToolsPanel(): boolean {
  return (
    typeof chrome !== 'undefined' &&
    Boolean(chrome.devtools?.inspectedWindow?.tabId)
  )
}

export function connectDevToolsBridge(): () => void {
  if (!isDevToolsPanel()) return () => {}

  const tabId = chrome.devtools.inspectedWindow.tabId
  const port = chrome.runtime.connect({ name: `devtools-panel-${tabId}` })

  const onMessage = (message: { type?: string; payload?: SpanData }) => {
    if (message.type !== 'TRACE' || !message.payload) return
    window.__TRACE__.push(message.payload)
  }

  port.onMessage.addListener(onMessage)

  return () => {
    port.onMessage.removeListener(onMessage)
    port.disconnect()
  }
}

connectDevToolsBridge()
