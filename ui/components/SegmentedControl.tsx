import { useEffect, useRef, useState } from 'preact/hooks'

type SegmentedControlProps<T extends string> = {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  ariaLabel: string
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: SegmentedControlProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [indicator, setIndicator] = useState({ width: 0, offset: 0 })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const activeIndex = options.findIndex((option) => option.value === value)
    const buttons =
      container.querySelectorAll<HTMLButtonElement>('.segmented-option')
    const activeButton = buttons[activeIndex]

    if (!activeButton) return

    setIndicator({
      width: activeButton.offsetWidth,
      offset: activeButton.offsetLeft,
    })
  }, [value, options])

  return (
    <div
      ref={containerRef}
      class="segmented-control"
      role="group"
      aria-label={ariaLabel}
    >
      <div
        class="segmented-indicator"
        style={{
          width: `${indicator.width}px`,
          transform: `translateX(${indicator.offset}px)`,
        }}
      />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          class={`segmented-option ${value === option.value ? 'is-active' : ''}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
