import { runCheckoutExample } from './checkout'

export async function runConcurrentCheckoutsExample() {
  const startTime = Date.now()
  const ids = ['CONCURRENT-A', 'CONCURRENT-B', 'CONCURRENT-C'] as const

  const results = await Promise.allSettled(
    ids.map((id) => runCheckoutExample(`${id}-${startTime}`)),
  )

  return {
    jobs: results.map((result, index) => ({
      id: ids[index],
      status: result.status,
    })),
  }
}
