import { type DbOrTx, and, eq, gt, gte, lt, lte, or, schema, sql } from "@sanitation/db"

import type { Calendar, Occupied } from "./availability"
import { getSettings } from "./settings"
import { type LocalDate, addDays, addHours, formatHour, localInstant, toLocalDate, toLocalHour } from "./time"

const { booking, callbackRequest, service, timeOff } = schema

/** Longest a Booking can be, so we know how far back to look for ones still running. */
const MAX_DURATION_HOURS = 12

/** Serialises every change that takes a Company's time, so two Clients cannot take the same hour. */
export async function lockCalendar(tx: DbOrTx, companyId: string): Promise<void> {
  await tx.execute(sql`select pg_advisory_xact_lock(731400, hashtext(${companyId}))`)
}

export function bookingLabel(b: { startsAt: Date; durationHours: number; title: string }): string {
  const from = toLocalHour(b.startsAt)
  return `${b.title}, ${formatHour(from)}–${formatHour((from + b.durationHours) % 24)}`
}

/** A Company's Booked Bookings and Time Off overlapping `[from, to)`. */
export async function loadOccupied(db: DbOrTx, companyId: string, from: Date, to: Date): Promise<Occupied[]> {
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
        eq(booking.companyId, companyId),
        eq(booking.status, "booked"),
        gte(booking.startsAt, addHours(from, -MAX_DURATION_HOURS)),
        lt(booking.startsAt, to)
      )
    )
  const offs = await db
    .select()
    .from(timeOff)
    .where(and(eq(timeOff.companyId, companyId), lt(timeOff.startsAt, to), gt(timeOff.endsAt, from)))

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

/** A Company's Calendar from `from` to `to` (inclusive local dates). */
export async function loadCalendar(
  db: DbOrTx,
  input: { companyId: string; from: LocalDate; to: LocalDate; now: Date }
): Promise<Calendar> {
  const start = localInstant(input.from)
  const end = localInstant(addDays(input.to, 1))
  const settings = await getSettings(db, input)
  // A job starting late on the last day can run into the next one.
  const occupied = await loadOccupied(db, input.companyId, start, addHours(end, MAX_DURATION_HOURS))
  const pending = await db
    .select({ desiredStartsAt: callbackRequest.desiredStartsAt, pausedDate: callbackRequest.pausedDate })
    .from(callbackRequest)
    .where(
      and(
        eq(callbackRequest.companyId, input.companyId),
        eq(callbackRequest.status, "pending"),
        or(
          and(gte(callbackRequest.desiredStartsAt, start), lt(callbackRequest.desiredStartsAt, end)),
          and(gte(callbackRequest.pausedDate, input.from), lte(callbackRequest.pausedDate, input.to))
        )
      )
    )
  const pausedDates = new Set(
    pending.flatMap((p) => {
      if (p.desiredStartsAt !== null) return [toLocalDate(p.desiredStartsAt)]
      return p.pausedDate === null ? [] : [p.pausedDate]
    })
  )
  return { now: input.now, ...settings, occupied, pausedDates }
}
