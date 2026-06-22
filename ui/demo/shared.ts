export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export type DemoExample = {
  id: string
  label: string
  description: string
  run: () => Promise<unknown>
}
