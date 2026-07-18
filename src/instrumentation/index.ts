import { installHttpTracing, uninstallHttpTracing } from './http'
import { uninstallLogCapture } from './logs'

export type AutoTracingOptions = {
  http?: boolean
  serviceName?: string
}

export function enableAutoTracing(options: AutoTracingOptions = {}) {
  if (options.http == true)
    installHttpTracing({ serviceName: options.serviceName })
}

export function disableAutoTracing() {
  uninstallLogCapture()
  uninstallHttpTracing()
}

export { installLogCapture, uninstallLogCapture } from './logs'
export { installHttpTracing, uninstallHttpTracing, traceFetch } from './http'
