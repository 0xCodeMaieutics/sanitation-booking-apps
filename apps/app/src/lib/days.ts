import type { LocalDate } from "@sanitation/core/time"

import type { Availability } from "@/trpc/types"

/** The day to show first: the earliest with a free start time, else the earliest working day. */
export function firstUsefulDate(days: Availability): LocalDate {
  const day = days.find((d) => d.startTimes.length > 0) ?? days.find((d) => d.status !== "closed") ?? days[0]
  return day?.date ?? ""
}
