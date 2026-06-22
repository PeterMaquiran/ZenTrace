import { runErrorRetryExample } from '../../../examples/error-retry'
import type { DemoExample } from '../shared'

export const errorRetryExample: DemoExample = {
  id: 'error-retry',
  label: 'Error + retry',
  description: 'Failed attempts, logs, and recovery — use the Errors filter',
  run: () => runErrorRetryExample(),
}
