export {
  LokiExporter,
  LOKI_EXPORTER_ID,
  toLokiStreams,
  type LokiExporterOptions,
} from './loki.exporter'
export {
  clearExporters,
  registerExporter,
  replaceExporter,
  unregisterExporter,
} from '../registry'

import { replaceExporter } from '../registry'

import { LokiExporter, type LokiExporterOptions } from './loki.exporter'

/** Register (or replace) a Loki exporter and return it. */
export function enableLokiExport(
  options: LokiExporterOptions = {},
): LokiExporter {
  const exporter = new LokiExporter(options)
  replaceExporter(exporter)
  return exporter
}
