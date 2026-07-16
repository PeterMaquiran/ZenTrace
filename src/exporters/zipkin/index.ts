export {
  ZipkinExporter,
  ZIPKIN_EXPORTER_ID,
  type ZipkinExporterOptions,
} from './zipkin.exporter'
export {
  registerExporter,
  unregisterExporter,
  clearExporters,
  replaceExporter,
} from '../registry'

import { replaceExporter } from '../registry'

import { ZipkinExporter, type ZipkinExporterOptions } from './zipkin.exporter'

/** Register (or replace) a Zipkin exporter and return it. */
export function enableZipkinExport(
  options: ZipkinExporterOptions = {},
): ZipkinExporter {
  const exporter = new ZipkinExporter(options)
  replaceExporter(exporter)
  return exporter
}
