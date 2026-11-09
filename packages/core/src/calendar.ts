import { type DbOrTx, and, eq, gt, gte, isNotNull, lt, schema, sql } from "@sanitation/db"

import type { Calendar, Occupied } from "./availability"
import { getSettings } from "./settings"
import { type LocalDate, addDays, addHours, formatHour, localInstant, toLocalDate, toLocalHour } from "./time"

const { booking, callbackRequest, service, timeOff } = schema

/** Longest a Booking can be, so we know how far back to look for ones still running. */
const MAX_DURATION_HOURS = 12

/** Serialises every change that takes time, so two Clients cannot take the same hour. */
export async function lockCalendar(tx: DbOrTx): Promise<void> {
  await tx.execute(sql`select pg_advisory_xact_lock(731400)`)
}

export function bookingLabel(b: { startsAt: Date; durationHours: number; title: string }): string {
  const from = toLocalHour(b.startsAt)
  return `${b.title}, ${formatHour(from)}–${formatHour((from + b.durationHours) % 24)}`
}

/** Booked Bookings and Time Off overlapping `[from, to)`. */
export async function loadOccupied(db: DbOrTx, from: Date, to: Date): Promise<Occupied[]> {
  const bookings = await db
    .select({
      startsAt: booking.startsAt,
      durationHours: booking.durationHours,
      serviceName: service.name,
      customService: booking.customService,
      clientName: booking.clientName,
    })
    .from(booking)
    .leftJoin(service, eq(service.id, booking.serviceId))
    .where(
      and(
        eq(booking.status, "booked"),
        gte(booking.startsAt, addHours(from, -MAX_DURATION_HOURS)),
        lt(booking.startsAt, to)
      )
    )
  const offs = await db
    .select()
    .from(timeOff)
    .where(and(lt(timeOff.startsAt, to), gt(timeOff.endsAt, from)))

  return [
    ...bookings.map((b) => ({
      kind: "booking" as const,
      startsAt: b.startsAt,
      endsAt: addHours(b.startsAt, b.durationHours),
      label: bookingLabel({
        startsAt: b.startsAt,
        durationHours: b.durationHours,
        title: `${b.serviceName ?? b.customService ?? ""} (${b.clientName})`,
      }),
    })),
    ...offs.map((o) => ({
      kind: "timeOff" as const,
      startsAt: o.startsAt,
      endsAt: o.endsAt,
      label: o.note || "არასამუშაო დრო",
    })),
  ].filter((o) => o.endsAt > from)
}

/** The Calendar from `from` to `to` (inclusive local dates). */
export async function loadCalendar(
  db: DbOrTx,
  input: { from: LocalDate; to: LocalDate; now: Date }
): Promise<Calendar> {
  const start = localInstant(input.from)
  const end = localInstant(addDays(input.to, 1))
  const settings = await getSettings(db)
  const occupied = await loadOccupied(db, start, end)
  const pending = await db
    .select({ desiredStartsAt: callbackRequest.desiredStartsAt })
    .from(callbackRequest)
    .where(
      and(
        eq(callbackRequest.status, "pending"),
        isNotNull(callbackRequest.desiredStartsAt),
        gte(callbackRequest.desiredStartsAt, start),
        lt(callbackRequest.desiredStartsAt, end)
      )
    )
  const pausedDates = new Set(
    pending.flatMap((p) => (p.desiredStartsAt === null ? [] : [toLocalDate(p.desiredStartsAt)]))
  )
  return { now: input.now, ...settings, occupied, pausedDates }
}
