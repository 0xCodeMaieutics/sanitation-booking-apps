import {
  type IsoWeekday,
  type LocalDate,
  addDays,
  addHours,
  localInstant,
  toLocalDate,
  weekdayOf,
} from "./time"

/** The Booking Window runs from today to this many days ahead. */
export const BOOKING_WINDOW_DAYS = 14

export type Occupied = {
  kind: "booking" | "timeOff"
  startsAt: Date
  endsAt: Date
  label: string
}

/** Everything that decides which start times a Client may pick. */
export type Calendar = {
  now: Date
  minNoticeHours: number
  workingDays: readonly IsoWeekday[]
  /** Working Hours: the first and last hourly start time of a Working Day, 0–23. */
  firstStartHour: number
  lastStartHour: number
  /** Booked Bookings and Time Off. Completed and Cancelled Bookings have already stopped occupying time. */
  occupied: readonly Occupied[]
  /** Days holding a Pending Callback Request's desired start time. */
  pausedDates: ReadonlySet<LocalDate>
}

export type DayStatus = "open" | "paused" | "closed"

export type DayAvailability = {
  date: LocalDate
  status: DayStatus
  startTimes: Date[]
}

export function bookingWindowDates(now: Date): LocalDate[] {
  const today = toLocalDate(now)
  return Array.from({ length: BOOKING_WINDOW_DAYS + 1 }, (_, i) => addDays(today, i))
}

export function isInBookingWindow(date: LocalDate, now: Date): boolean {
  const today = toLocalDate(now)
  return date >= today && date <= addDays(today, BOOKING_WINDOW_DAYS)
}

export function overlapping(occupied: readonly Occupied[], startsAt: Date, endsAt: Date): Occupied[] {
  return occupied.filter((o) => o.startsAt < endsAt && startsAt < o.endsAt)
}

export function dayStatus(calendar: Calendar, date: LocalDate): DayStatus {
  if (!calendar.workingDays.includes(weekdayOf(date))) return "closed"
  if (calendar.pausedDates.has(date)) return "paused"
  return "open"
}

/**
 * The Available Start Times on one day. A Standard Service needs its whole Duration clear;
 * a Callback Request's desired start time (`durationHours: null`) only needs its start hour clear.
 */
export function availableStartTimes(
  calendar: Calendar,
  date: LocalDate,
  durationHours: number | null
): Date[] {
  if (!isInBookingWindow(date, calendar.now) || dayStatus(calendar, date) !== "open") return []
  const earliest = addHours(calendar.now, calendar.minNoticeHours)
  const times: Date[] = []
  for (let hour = calendar.firstStartHour; hour <= calendar.lastStartHour; hour++) {
    const startsAt = localInstant(date, hour)
    if (startsAt <= calendar.now || startsAt < earliest) continue
    const endsAt = addHours(startsAt, durationHours ?? 1)
    if (overlapping(calendar.occupied, startsAt, endsAt).length === 0) times.push(startsAt)
  }
  return times
}

export function windowAvailability(calendar: Calendar, durationHours: number | null): DayAvailability[] {
  return bookingWindowDates(calendar.now).map((date) => ({
    date,
    status: dayStatus(calendar, date),
    startTimes: availableStartTimes(calendar, date, durationHours),
  }))
}

export function isAvailableStartTime(
  calendar: Calendar,
  startsAt: Date,
  durationHours: number | null
): boolean {
  const date = toLocalDate(startsAt)
  return availableStartTimes(calendar, date, durationHours).some((t) => t.getTime() === startsAt.getTime())
}
