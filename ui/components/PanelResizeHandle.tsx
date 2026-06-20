import { useEffect, useRef } from 'preact/hooks'

type PanelResizeHandleProps = {
  onResize: (deltaY: number) => void
  onResizeEnd?: () => void
}

export function PanelResizeHandle({
  onResize,
  onResizeEnd,
}: PanelResizeHandleProps) {
  const draggingRef = useRef(false)

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      if (!draggingRef.current) return
      onResize(event.movementY)
    }

    const onMouseUp = () => {
      if (!draggingRef.current) return
      draggingRef.current = false
      document.body.classList.remove('is-resizing-panels')
      onResizeEnd?.()
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [onResize, onResizeEnd])

  return (
    <div
      class="panel-resize-handle"
      role="separator"
      aria-orientation="horizontal"
      aria-label="Resize logs panel"
      onMouseDown={() => {
        draggingRef.current = true
        document.body.classList.add('is-resizing-panels')
      }}
    />
  )
}
