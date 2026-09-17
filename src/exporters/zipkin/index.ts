export {
  ZipkinExporter,
  ZIPKIN_EXPORTER_ID,
  type ZipkinExporterOptions,
} from './zipkin.exporter.js'

import { replaceExporter, unregisterExportersById } from '../registry.js'

import {
  ZIPKIN_EXPORTER_ID,
  ZipkinExporter,
  type ZipkinExporterOptions,
} from './zipkin.exporter.js'

/** Register (or replace) a Zipkin exporter and return it. */
export function enableZipkinExport(
  options: ZipkinExporterOptions = {},
): ZipkinExporter {
  const exporter = new ZipkinExporter(options)
  replaceExporter(exporter)
  return exporter
}

/** Stop sending spans to Zipkin. */
export function disableZipkinExport(): void {
  unregisterExportersById(ZIPKIN_EXPORTER_ID)
}
