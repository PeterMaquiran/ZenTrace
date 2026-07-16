import type { SpanData } from '../core/types'

export interface Exporter {
  export(span: SpanData): Promise<void>
  flush?(): Promise<void>
}
