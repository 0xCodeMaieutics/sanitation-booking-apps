import { type DbOrTx, asc, eq, gt, schema } from "@sanitation/db"

import { DomainError } from "./errors"
import { type LocalDate, addDays, localInstant } from "./time"

const { timeOff } = schema

/** Time Off still to come or under way, soonest first. */
export async function listTimeOff(db: DbOrTx, input: { now: Date }) {
  return db.select().from(timeOff).where(gt(timeOff.endsAt, input.now)).orderBy(asc(timeOff.startsAt))
}

/** A whole day (no hours) or an hour range on one date, e.g. 09:00–13:00. */
export async function addTimeOff(
  db: DbOrTx,
  input: { date: LocalDate; fromHour: number | null; toHour: number | null; note: string }
): Promise<void> {
  const wholeDay = input.fromHour === null || input.toHour === null
  const startsAt = wholeDay ? localInstant(input.date) : localInstant(input.date, input.fromHour ?? 0)
  const endsAt = wholeDay ? localInstant(addDays(input.date, 1)) : localInstant(input.date, input.toHour ?? 0)
  if (endsAt <= startsAt) throw new DomainError("INVALID_STATE")
  await db.insert(timeOff).values({ startsAt, endsAt, note: input.note })
}

export async function removeTimeOff(db: DbOrTx, input: { timeOffId: string }): Promise<void> {
  const rows = await db.delete(timeOff).where(eq(timeOff.id, input.timeOffId)).returning({ id: timeOff.id })
  if (rows.length === 0) throw new DomainError("NOT_FOUND")
}
