import { runParallelOrderExample } from '../../../examples/parallel-order'
import type { DemoExample } from '../shared'

export const parallelOrdersExample: DemoExample = {
  id: 'parallel',
  label: 'Parallel order',
  description: 'Promise.all with three sibling spans on the timeline',
  run: () => runParallelOrderExample(),
}
