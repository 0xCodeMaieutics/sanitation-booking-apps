"use client"

import { formatHour, toLocalHour } from "@sanitation/core/time"
import { cn } from "@sanitation/ui"

export function TimeGrid({
  times,
  selected,
  onSelect,
  emptyText,
}: {
  times: Date[]
  selected: Date | null
  onSelect: (time: Date) => void
  emptyText: string
}) {
  if (times.length === 0) {
    return (
      <p className="rounded-2xl bg-paper px-4 py-6 text-center text-ink-soft ring-1 ring-border">
        {emptyText}
      </p>
    )
  }
  return (
    <div role="radiogroup" aria-label="დრო" className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {times.map((t) => {
        const isSelected = selected?.getTime() === t.getTime()
        return (
          <label
            key={t.getTime()}
            className={cn(
              "flex h-12 cursor-pointer items-center justify-center rounded-xl text-base font-medium tabular-nums ring-1 transition-colors duration-150 has-focus-visible:ring-2 has-focus-visible:ring-ring",
              isSelected
                ? "bg-brand text-paper ring-brand"
                : "bg-paper text-ink ring-border hover:ring-brand-soft active:bg-mist"
            )}
          >
            <input
              type="radio"
              name="time"
              className="sr-only"
              value={t.toISOString()}
              checked={isSelected}
              onChange={() => onSelect(t)}
            />
            {formatHour(toLocalHour(t))}
          </label>
        )
      })}
    </div>
  )
}
