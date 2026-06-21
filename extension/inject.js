window.addEventListener('message', (event) => {
  if (event.source !== window) return
  if (event.data?.source !== 'devtrace' || event.data?.type !== 'TRACE_EVENT') {
    return
  }

  chrome.runtime.sendMessage({
    type: 'DEVTRACE_SPAN',
    payload: event.data.payload,
  })
})
