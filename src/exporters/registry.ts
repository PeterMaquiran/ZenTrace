import type { Exporter } from './base'

const REGISTRY_KEY = '__ZENTRACE_EXPORTERS__'

type ExporterRegistryState = {
  exporters: Set<Exporter>
}

function getState(): ExporterRegistryState {
  const globalRef = globalThis as typeof globalThis & {
    [REGISTRY_KEY]?: ExporterRegistryState
  }

  if (!globalRef[REGISTRY_KEY]) {
    globalRef[REGISTRY_KEY] = { exporters: new Set() }
  }

  return globalRef[REGISTRY_KEY]
}

export function registerExporter(exporter: Exporter): void {
  getState().exporters.add(exporter)
}

export function unregisterExporter(exporter: Exporter): void {
  getState().exporters.delete(exporter)
}

/** Drop every exporter that reports the given `exporterId`. */
export function unregisterExportersById(exporterId: string): void {
  const { exporters } = getState()
  for (const existing of [...exporters]) {
    if ((existing as { exporterId?: string }).exporterId === exporterId) {
      exporters.delete(existing)
    }
  }
}

export function getExporters(): ReadonlySet<Exporter> {
  return getState().exporters
}

export function clearExporters(): void {
  getState().exporters.clear()
}

/** Drop exporters that expose the same `exporterId` (survives Vite HMR class identity). */
export function replaceExporter(
  exporter: Exporter & { exporterId?: string },
): void {
  const { exporters } = getState()
  if (exporter.exporterId) {
    for (const existing of [...exporters]) {
      if (
        (existing as { exporterId?: string }).exporterId === exporter.exporterId
      ) {
        exporters.delete(existing)
      }
    }
  }
  exporters.add(exporter)
}
