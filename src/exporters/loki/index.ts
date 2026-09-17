export {
  LokiExporter,
  LOKI_EXPORTER_ID,
  toLokiStreams,
  type LokiExporterOptions,
} from './loki.exporter.js'

import { replaceExporter, unregisterExportersById } from '../registry.js'

import {
  LOKI_EXPORTER_ID,
  LokiExporter,
  type LokiExporterOptions,
} from './loki.exporter.js'

/** Register (or replace) a Loki exporter and return it. */
export function enableLokiExport(
  options: LokiExporterOptions = {},
): LokiExporter {
  const exporter = new LokiExporter(options)
  replaceExporter(exporter)
  return exporter
}

/** Stop sending captured logs to Loki. */
export function disableLokiExport(): void {
  unregisterExportersById(LOKI_EXPORTER_ID)
}
