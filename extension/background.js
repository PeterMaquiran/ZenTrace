/** @type {Map<number, Set<chrome.runtime.Port>>} */
const panelPortsByTab = new Map()

/** @type {Map<number, Array<{ type: string, payload: unknown }>>} */
const bufferedSpansByTab = new Map()

function getPorts(tabId) {
  return panelPortsByTab.get(tabId)
}

function hasLivePanel(tabId) {
  const ports = getPorts(tabId)
  return Boolean(ports && ports.size > 0)
}

function upsertBufferedSpan(tabId, payload) {
  if (!bufferedSpansByTab.has(tabId)) {
    bufferedSpansByTab.set(tabId, [])
  }

  const buffer = bufferedSpansByTab.get(tabId)
  const spanId = payload?.id
  const existingIndex = spanId
    ? buffer.findIndex((item) => item.payload?.id === spanId)
    : -1

  const entry = { type: 'TRACE', payload }

  if (existingIndex >= 0) buffer[existingIndex] = entry
  else buffer.push(entry)
}

function postToPorts(tabId, message) {
  const ports = getPorts(tabId)
  if (!ports || ports.size === 0) return false

  for (const port of ports) {
    port.postMessage(message)
  }

  return true
}

function flushBufferedSpans(tabId) {
  if (!hasLivePanel(tabId)) return

  const buffer = bufferedSpansByTab.get(tabId)
  if (!buffer?.length) return

  for (const message of buffer) {
    postToPorts(tabId, message)
  }

  bufferedSpansByTab.delete(tabId)
}

function deliverSpan(tabId, payload) {
  const message = { type: 'TRACE', payload }

  if (postToPorts(tabId, message)) return

  upsertBufferedSpan(tabId, payload)
}

chrome.runtime.onConnect.addListener((port) => {
  const match = port.name.match(/^devtools-panel-(\d+)$/)
  if (!match) return

  const tabId = Number(match[1])
  if (!panelPortsByTab.has(tabId)) {
    panelPortsByTab.set(tabId, new Set())
  }

  const ports = panelPortsByTab.get(tabId)
  ports.add(port)

  port.onMessage.addListener((message) => {
    if (message?.type !== 'PANEL_READY') return
    flushBufferedSpans(tabId)
  })

  port.onDisconnect.addListener(() => {
    ports.delete(port)
    if (ports.size === 0) panelPortsByTab.delete(tabId)
  })
})

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type !== 'DEVTRACE_SPAN' || !sender.tab?.id) return

  deliverSpan(sender.tab.id, message.payload)
})
