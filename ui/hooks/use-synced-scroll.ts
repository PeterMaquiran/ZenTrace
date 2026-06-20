import type { RefObject } from 'preact'
import { useEffect, useRef } from 'preact/hooks'

export function useSyncedScroll(
  refA: RefObject<HTMLElement>,
  refB: RefObject<HTMLElement>,
  enabled = true,
) {
  const syncingRef = useRef(false)

  useEffect(() => {
    if (!enabled) return

    const a = refA.current
    const b = refB.current
    if (!a || !b) return

    const sync = (source: HTMLElement, target: HTMLElement) => {
      if (syncingRef.current) return
      syncingRef.current = true
      target.scrollTop = source.scrollTop
      requestAnimationFrame(() => {
        syncingRef.current = false
      })
    }

    const onScrollA = () => sync(a, b)
    const onScrollB = () => sync(b, a)

    a.addEventListener('scroll', onScrollA, { passive: true })
    b.addEventListener('scroll', onScrollB, { passive: true })

    return () => {
      a.removeEventListener('scroll', onScrollA)
      b.removeEventListener('scroll', onScrollB)
    }
  }, [enabled, refA, refB])
}

export function scrollRowIntoView(
  container: HTMLElement | null,
  rowIndex: number,
  rowHeight: number,
) {
  if (!container || rowIndex < 0) return

  const rowTop = rowIndex * rowHeight
  const rowBottom = rowTop + rowHeight
  const viewTop = container.scrollTop
  const viewBottom = viewTop + container.clientHeight

  if (rowTop >= viewTop && rowBottom <= viewBottom) return

  const targetScroll = Math.max(
    0,
    rowTop - container.clientHeight / 2 + rowHeight / 2,
  )
  container.scrollTop = targetScroll
}
