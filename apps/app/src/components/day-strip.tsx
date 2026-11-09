"use client"

import { type LocalDate, WEEKDAYS_SHORT, dayOfMonth, monthName, weekdayOf } from "@sanitation/core/time"
import { cn } from "@sanitation/ui"
import { PauseIcon } from "lucide-react"

import type { DayAvailability } from "@/trpc/types"

/** The Booking Window as a horizontally scrolling row of days. */
export function DayStrip({
  days,
  selected,
  onSelect,
}: {
  days: DayAvailability[]
  selected: LocalDate
  onSelect: (date: LocalDate) => void
}) {
  return (
    <div
      role="radiogroup"
      aria-label="დღე"
      className="-mx-4 flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 pt-1.5 pb-2 [scrollbar-width:none]"
    >
      {days.map((day) => {
        const isSelected = day.date === selected
        const closed = day.status === "closed"
        const full = day.status === "open" && day.startTimes.length === 0
        return (
          <label
            key={day.date}
            className={cn(
              "relative flex h-20 w-16 shrink-0 cursor-pointer snap-start flex-col items-center justify-center gap-0.5 rounded-2xl ring-1 transition-colors duration-150 has-focus-visible:ring-2 has-focus-visible:ring-ring",
              isSelected
                ? "bg-brand text-paper ring-brand"
                : "bg-paper text-ink ring-border hover:ring-brand-soft active:bg-mist",
              closed && "cursor-not-allowed bg-transparent text-ink-soft/60 ring-transparent",
              full && !isSelected && "text-ink-soft"
            )}
          >
            <input
              type="radio"
              name="day"
              className="sr-only"
              value={day.date}
              checked={isSelected}
              disabled={closed}
              onChange={() => onSelect(day.date)}
            />
            <span className="text-xs">{WEEKDAYS_SHORT[weekdayOf(day.date)]}</span>
            <span className="text-xl leading-none font-semibold">{dayOfMonth(day.date)}</span>
            <span className="text-[11px]">{monthName(day.date).slice(0, 3)}</span>
            {day.status === "paused" ? (
              <span
                className={cn(
                  "absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-warning-soft text-warning ring-2",
                  isSelected ? "ring-brand" : "ring-canvas"
                )}
              >
                <PauseIcon aria-hidden className="size-3" />
                <span className="sr-only">შეჩერებულია</span>
              </span>
            ) : null}
          </label>
        )
      })}
    </div>
  )
}
