import { useState } from 'preact/hooks'

import {
  parseStructuredValue,
  tokenizeLooseJson,
} from '../parse-structured-value'

type JsonViewerProps = {
  value: string
  /** Collapse nodes deeper than this level (0 = root expanded). */
  collapseAfterDepth?: number
}

export function tryParseJson(value: string): unknown | undefined {
  return parseStructuredValue(value)
}

export function JsonViewer({ value, collapseAfterDepth = 1 }: JsonViewerProps) {
  const parsed = parseStructuredValue(value)

  if (parsed === undefined) {
    return <HighlightedLogValue value={value} />
  }

  return (
    <div class="json-viewer">
      <JsonNode
        data={parsed}
        depth={0}
        collapseAfterDepth={collapseAfterDepth}
        isLast
      />
    </div>
  )
}

function HighlightedLogValue({ value }: { value: string }) {
  const tokens = tokenizeLooseJson(value)

  return (
    <pre class="json-viewer json-viewer-raw">
      <code>
        {tokens.map((token, index) => (
          <span key={index} class={`json-${token.type}`}>
            {token.text}
          </span>
        ))}
      </code>
    </pre>
  )
}

type JsonNodeProps = {
  data: unknown
  keyName?: string
  depth: number
  collapseAfterDepth: number
  isLast?: boolean
}

function JsonNode({
  data,
  keyName,
  depth,
  collapseAfterDepth,
  isLast = true,
}: JsonNodeProps) {
  const [collapsed, setCollapsed] = useState(depth > collapseAfterDepth)
  const comma = isLast ? '' : ','

  if (data === null) {
    return (
      <div
        class="json-line"
        style={{ '--json-depth': depth } as Record<string, string>}
      >
        {keyName !== undefined && <JsonKey name={keyName} />}
        <span class="json-null">null</span>
        <span class="json-punct">{comma}</span>
      </div>
    )
  }

  if (typeof data === 'boolean') {
    return (
      <div
        class="json-line"
        style={{ '--json-depth': depth } as Record<string, string>}
      >
        {keyName !== undefined && <JsonKey name={keyName} />}
        <span class="json-boolean">{String(data)}</span>
        <span class="json-punct">{comma}</span>
      </div>
    )
  }

  if (typeof data === 'number') {
    return (
      <div
        class="json-line"
        style={{ '--json-depth': depth } as Record<string, string>}
      >
        {keyName !== undefined && <JsonKey name={keyName} />}
        <span class="json-number">{String(data)}</span>
        <span class="json-punct">{comma}</span>
      </div>
    )
  }

  if (typeof data === 'string') {
    return (
      <div
        class="json-line"
        style={{ '--json-depth': depth } as Record<string, string>}
      >
        {keyName !== undefined && <JsonKey name={keyName} />}
        <span class="json-string">"{data}"</span>
        <span class="json-punct">{comma}</span>
      </div>
    )
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return (
        <div
          class="json-line"
          style={{ '--json-depth': depth } as Record<string, string>}
        >
          {keyName !== undefined && <JsonKey name={keyName} />}
          <span class="json-punct">[]</span>
          <span class="json-punct">{comma}</span>
        </div>
      )
    }

    return (
      <div
        class="json-block"
        style={{ '--json-depth': depth } as Record<string, string>}
      >
        <div class="json-line json-line-toggle">
          <button
            type="button"
            class="json-toggle"
            aria-expanded={!collapsed}
            onClick={() => setCollapsed((open) => !open)}
          >
            {collapsed ? '▸' : '▾'}
          </button>
          {keyName !== undefined && <JsonKey name={keyName} />}
          <span class="json-punct">[</span>
          {collapsed && (
            <span class="json-preview">
              …{data.length} item{data.length === 1 ? '' : 's'}
            </span>
          )}
          {collapsed && <span class="json-punct">]</span>}
          {collapsed && <span class="json-punct">{comma}</span>}
        </div>
        {!collapsed &&
          data.map((item, index) => (
            <JsonNode
              key={index}
              data={item}
              depth={depth + 1}
              collapseAfterDepth={collapseAfterDepth}
              isLast={index === data.length - 1}
            />
          ))}
        {!collapsed && (
          <div
            class="json-line"
            style={{ '--json-depth': depth } as Record<string, string>}
          >
            <span class="json-punct">]</span>
            <span class="json-punct">{comma}</span>
          </div>
        )}
      </div>
    )
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data as Record<string, unknown>)

    if (entries.length === 0) {
      return (
        <div
          class="json-line"
          style={{ '--json-depth': depth } as Record<string, string>}
        >
          {keyName !== undefined && <JsonKey name={keyName} />}
          <span class="json-punct">{'{}'}</span>
          <span class="json-punct">{comma}</span>
        </div>
      )
    }

    return (
      <div
        class="json-block"
        style={{ '--json-depth': depth } as Record<string, string>}
      >
        <div class="json-line json-line-toggle">
          <button
            type="button"
            class="json-toggle"
            aria-expanded={!collapsed}
            onClick={() => setCollapsed((open) => !open)}
          >
            {collapsed ? '▸' : '▾'}
          </button>
          {keyName !== undefined && <JsonKey name={keyName} />}
          <span class="json-punct">{'{'}</span>
          {collapsed && (
            <span class="json-preview">
              …{entries.length} key{entries.length === 1 ? '' : 's'}
            </span>
          )}
          {collapsed && <span class="json-punct">{'}'}</span>}
          {collapsed && <span class="json-punct">{comma}</span>}
        </div>
        {!collapsed &&
          entries.map(([name, child], index) => (
            <JsonNode
              key={name}
              keyName={name}
              data={child}
              depth={depth + 1}
              collapseAfterDepth={collapseAfterDepth}
              isLast={index === entries.length - 1}
            />
          ))}
        {!collapsed && (
          <div
            class="json-line"
            style={{ '--json-depth': depth } as Record<string, string>}
          >
            <span class="json-punct">{'}'}</span>
            <span class="json-punct">{comma}</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      class="json-line"
      style={{ '--json-depth': depth } as Record<string, string>}
    >
      {keyName !== undefined && <JsonKey name={keyName} />}
      <span class="json-string">{String(data)}</span>
      <span class="json-punct">{comma}</span>
    </div>
  )
}

export { HighlightedLogValue }

function JsonKey({ name }: { name: string }) {
  return (
    <>
      <span class="json-key">"{name}"</span>
      <span class="json-punct">: </span>
    </>
  )
}
