import type { SpanData } from '../core/types.js'

export interface Exporter {
  export(span: SpanData): Promise<void>
  flush?(): Promise<void>
}
