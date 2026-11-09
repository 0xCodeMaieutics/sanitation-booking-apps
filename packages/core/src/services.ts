import { type DbOrTx, asc, eq, isNull, schema } from "@sanitation/db"

import { DomainError } from "./errors"

const { service } = schema

export type ServiceInput = {
  name: string
  description: string
  durationHours: number
  priceGel: number
}

/** Standard Services in display order; Archived ones only when asked for. */
export async function listServices(db: DbOrTx, input: { includeArchived: boolean }) {
  return db
    .select()
    .from(service)
    .where(input.includeArchived ? undefined : isNull(service.archivedAt))
    .orderBy(asc(service.archivedAt), asc(service.sortOrder), asc(service.createdAt))
}

export async function getService(db: DbOrTx, id: string) {
  const [row] = await db.select().from(service).where(eq(service.id, id))
  return row ?? null
}

export async function createService(db: DbOrTx, input: ServiceInput): Promise<{ serviceId: string }> {
  const [row] = await db.insert(service).values(input).returning({ id: service.id })
  if (row === undefined) throw new Error("Failed to create service")
  return { serviceId: row.id }
}

/** Existing Bookings keep the Duration and Booking Price they were made with. */
export async function updateService(db: DbOrTx, input: ServiceInput & { serviceId: string }) {
  const { serviceId, ...values } = input
  const rows = await db
    .update(service)
    .set(values)
    .where(eq(service.id, serviceId))
    .returning({ id: service.id })
  if (rows.length === 0) throw new DomainError("NOT_FOUND")
}

export async function setServiceArchived(
  db: DbOrTx,
  input: { serviceId: string; archived: boolean; now: Date }
) {
  const rows = await db
    .update(service)
    .set({ archivedAt: input.archived ? input.now : null })
    .where(eq(service.id, input.serviceId))
    .returning({ id: service.id })
  if (rows.length === 0) throw new DomainError("NOT_FOUND")
}
