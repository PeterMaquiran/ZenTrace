import type { DemoExample } from '../shared'

import { checkoutExample } from './checkout'
import { concurrentCheckoutsExample } from './concurrent-checkouts'
import { errorRetryExample } from './error-retry'
import { parallelOrdersExample } from './parallel-orders'
import { traceFnCartExample } from './trace-fn-cart'


export const demoExamples: DemoExample[] = [
  checkoutExample,
  parallelOrdersExample,
  traceFnCartExample,
  errorRetryExample,
  concurrentCheckoutsExample,
]

export const demoExamplesById = Object.fromEntries(
  demoExamples.map((example) => [example.id, example]),
) as Record<string, DemoExample>

export {
  checkoutExample,
  concurrentCheckoutsExample,
  errorRetryExample,
  parallelOrdersExample,
  traceFnCartExample,
}
