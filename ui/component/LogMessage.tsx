import { JsonViewer, tryParseJson } from './JsonViewer'

export function LogMessage({ message }: { message: string }) {
  const parsed = tryParseJson(message)

  if (parsed !== undefined) {
    return (
      <div class="drawer-log-json">
        <JsonViewer value={message} collapseAfterDepth={0} />
      </div>
    )
  }

  return <pre class="drawer-log-message">{message}</pre>
}
