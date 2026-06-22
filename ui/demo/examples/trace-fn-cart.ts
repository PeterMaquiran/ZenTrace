import { runTraceFnCartExample } from '../../../examples/trace-fn-cart'
import type { DemoExample } from '../shared'

export const traceFnCartExample: DemoExample = {
  id: 'trace-fn',
  label: 'traceFn cart',
  description: 'Standalone functions wrapped with traceFn()',
  run: () => runTraceFnCartExample(),
}
