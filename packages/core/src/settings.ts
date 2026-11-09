import { type DbOrTx, eq, schema } from "@sanitation/db"

import type { IsoWeekday } from "./time"

export type Settings = {
  minNoticeHours: number
  workingDays: IsoWeekday[]
  /** Working Hours: the first and last hourly start time of a Working Day, 0–23. */
  firstStartHour: number
  lastStartHour: number
}

const DEFAULTS: Settings = {
  minNoticeHours: 2,
  workingDays: [1, 2, 3, 4, 5, 6, 7],
  firstStartHour: 9,
  lastStartHour: 18,
}

export async function getSettings(db: DbOrTx, input: { companyId: string }): Promise<Settings> {
  const [row] = await db.select().from(schema.settings).where(eq(schema.settings.companyId, input.companyId))
  if (row === undefined) return DEFAULTS
  return {
    minNoticeHours: row.minNoticeHours,
    workingDays: row.workingDays as IsoWeekday[],
    firstStartHour: row.firstStartHour,
    lastStartHour: row.lastStartHour,
  }
}

export async function updateSettings(db: DbOrTx, input: Settings & { companyId: string }): Promise<void> {
  const values = {
    minNoticeHours: input.minNoticeHours,
    workingDays: [...new Set(input.workingDays)].toSorted((a, b) => a - b),
    firstStartHour: input.firstStartHour,
    lastStartHour: input.lastStartHour,
  }
  await db
    .insert(schema.settings)
    .values({ companyId: input.companyId, ...values })
    .onConflictDoUpdate({ target: schema.settings.companyId, set: values })
}
