import { installHttpTracing, uninstallHttpTracing } from './http'
import { installLogCapture, uninstallLogCapture } from './logs'

export type AutoTracingOptions = {
  logs?: boolean
  http?: boolean
  serviceName?: string
}

export function enableAutoTracing(options: AutoTracingOptions = {}) {
  if (options.logs !== false) installLogCapture()
  if (options.http !== false)
    installHttpTracing({ serviceName: options.serviceName })
}

export function disableAutoTracing() {
  uninstallLogCapture()
  uninstallHttpTracing()
}

export { installLogCapture, uninstallLogCapture } from './logs'
export { installHttpTracing, uninstallHttpTracing, traceFetch } from './http'
