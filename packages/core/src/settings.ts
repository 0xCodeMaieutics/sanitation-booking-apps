import { type DbOrTx, eq, schema } from "@sanitation/db"

import type { IsoWeekday } from "./time"

export type Settings = { minNoticeHours: number; workingDays: IsoWeekday[] }

const DEFAULTS: Settings = { minNoticeHours: 2, workingDays: [1, 2, 3, 4, 5, 6, 7] }

export async function getSettings(db: DbOrTx): Promise<Settings> {
  const [row] = await db.select().from(schema.settings).where(eq(schema.settings.id, 1))
  if (row === undefined) return DEFAULTS
  return { minNoticeHours: row.minNoticeHours, workingDays: row.workingDays as IsoWeekday[] }
}

export async function updateSettings(db: DbOrTx, input: Settings): Promise<void> {
  const workingDays = [...new Set(input.workingDays)].toSorted((a, b) => a - b)
  await db
    .insert(schema.settings)
    .values({ id: 1, minNoticeHours: input.minNoticeHours, workingDays })
    .onConflictDoUpdate({
      target: schema.settings.id,
      set: { minNoticeHours: input.minNoticeHours, workingDays },
    })
}
