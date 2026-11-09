import { type LocalDate, addDays, formatDate, toLocalDate } from "@sanitation/core/time"

export function formatPrice(priceGel: number | null): string {
  return priceGel === null ? "—" : `${priceGel} ₾`
}

export function formatDuration(hours: number): string {
  return `${hours} სთ`
}

/** "დღეს", "ხვალ", or the full date. */
export function dayHeading(date: LocalDate, now: Date): string {
  const today = toLocalDate(now)
  if (date === today) return `დღეს · ${formatDate(date)}`
  if (date === addDays(today, 1)) return `ხვალ · ${formatDate(date)}`
  return formatDate(date)
}

export const STATUS_LABEL = {
  booked: { label: "დაჯავშნილი", variant: "default" },
  completed: { label: "შესრულებული", variant: "success" },
  cancelled: { label: "გაუქმებული", variant: "muted" },
} as const

export function requestTitle(r: { services: { name: string }[]; description: string }): string {
  const parts = [...r.services.map((s) => s.name), r.description].filter((p) => p !== "")
  return parts.length === 0 ? "უკუკავშირი" : parts.join(", ")
}

/** The day a Callback Request is for: its desired start time's, or the Paused Day it was left on. */
export function requestDate(r: { desiredStartsAt: Date | null; pausedDate: LocalDate | null }) {
  return r.desiredStartsAt !== null ? toLocalDate(r.desiredStartsAt) : r.pausedDate
}

export const REQUEST_STATUS_LABEL = {
  pending: { label: "მოლოდინში", variant: "warning" },
  accepted: { label: "მიღებული", variant: "success" },
  declined: { label: "უარყოფილი", variant: "muted" },
} as const
