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
  let port: chrome.runtime.Port | null = null
  let disposed = false

  const onMessage = (message: { type?: string; payload?: SpanData }) => {
    if (message.type !== 'TRACE' || !message.payload) return
    window.__TRACE__.push(message.payload)
  }

  const connect = () => {
    if (disposed) return

    port = chrome.runtime.connect({ name: `devtools-panel-${tabId}` })
    port.onMessage.addListener(onMessage)

    port.onDisconnect.addListener(() => {
      port?.onMessage.removeListener(onMessage)
      port = null
      if (!disposed) setTimeout(connect, 500)
    })

    port.postMessage({ type: 'PANEL_READY' })
  }

  connect()

  return () => {
    disposed = true
    port?.onMessage.removeListener(onMessage)
    port?.disconnect()
  }
}

connectDevToolsBridge()
