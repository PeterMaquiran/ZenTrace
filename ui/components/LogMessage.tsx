import { useState } from 'preact/hooks'

import {
  splitMessageWithStructuredSuffix,
  structuredValuePreview,
  tokenizeLooseJson,
} from '../parse-structured-value'

import { HighlightedLogValue, JsonViewer, tryParseJson } from './JsonViewer'

type PrefixedStructuredLogProps = {
  prefix: string
  rawStructured: string
  data: unknown
}

function PrefixedStructuredLog({
  prefix,
  rawStructured,
  data,
}: PrefixedStructuredLogProps) {
  const [expanded, setExpanded] = useState(false)
  const preview = structuredValuePreview(data)

  return (
    <div class="log-message-mixed">
      <div class="log-message-mixed-line">
        <span class="log-message-prefix">{prefix}</span>
        {!expanded && (
          <code class="log-message-inline-structured">
            {tokenizeLooseJson(rawStructured).map((token, index) => (
              <span key={index} class={`json-${token.type}`}>
                {token.text}
              </span>
            ))}
          </code>
        )}
        <button
          type="button"
          class="log-message-structured-toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded((open) => !open)}
        >
          <span class="log-message-toggle-icon">{expanded ? '▾' : '▸'}</span>
          <span class="log-message-structured-preview">{preview}</span>
        </button>
      </div>
      {expanded && (
        <div class="drawer-log-json log-message-structured-body">
          <JsonViewer value={rawStructured} collapseAfterDepth={1} />
        </div>
      )}
    </div>
  )
}

export function LogMessage({ message }: { message: string }) {
  const parsed = tryParseJson(message)

  if (parsed !== undefined) {
    return (
      <div class="drawer-log-json">
        <JsonViewer value={message} collapseAfterDepth={0} />
      </div>
    )
  }

  const split = splitMessageWithStructuredSuffix(message)
  if (split) {
    return (
      <PrefixedStructuredLog
        prefix={split.prefix}
        rawStructured={split.rawStructured}
        data={split.data}
      />
    )
  }

  return <HighlightedLogValue value={message} />
}
