import { runConcurrentCheckoutsExample } from '../../../examples/concurrent-checkouts'
import type { DemoExample } from '../shared'

export const concurrentCheckoutsExample: DemoExample = {
  id: 'concurrent',
  label: '3 concurrent checkouts',
  description: 'Three root traces at once — separate trees in the trace list',
  run: () => runConcurrentCheckoutsExample(),
}
