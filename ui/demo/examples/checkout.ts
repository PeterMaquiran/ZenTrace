import { runCheckoutExample } from '../../../examples/checkout'
import type { DemoExample } from '../shared'

export const checkoutExample: DemoExample = {
  id: 'checkout',
  label: 'Checkout flow',
  description:
    'Auth → HTTP → parallel pricing + inventory → payment → notification',
  run: () => runCheckoutExample(),
}
