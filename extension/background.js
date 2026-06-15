/** @type {Map<number, Set<chrome.runtime.Port>>} */
const panelPortsByTab = new Map()

chrome.runtime.onConnect.addListener((port) => {
  const match = port.name.match(/^devtools-panel-(\d+)$/)
  if (!match) return

  const tabId = Number(match[1])
  if (!panelPortsByTab.has(tabId)) {
    panelPortsByTab.set(tabId, new Set())
  }

  const ports = panelPortsByTab.get(tabId)
  ports.add(port)

  port.onDisconnect.addListener(() => {
    ports.delete(port)
    if (ports.size === 0) panelPortsByTab.delete(tabId)
  })
})

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type !== 'DEVTRACE_SPAN' || !sender.tab?.id) return

  const ports = panelPortsByTab.get(sender.tab.id)
  if (!ports) return

  for (const port of ports) {
    port.postMessage({ type: 'TRACE', payload: message.payload })
  }
})
