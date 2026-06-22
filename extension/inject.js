window.addEventListener('message', (event) => {
  if (event.source !== window) return
  if (event.data?.source !== 'zentrace' || event.data?.type !== 'TRACE_EVENT') {
    return
  }

  chrome.runtime.sendMessage({
    type: 'ZENTRACE_SPAN',
    payload: event.data.payload,
  })
})
