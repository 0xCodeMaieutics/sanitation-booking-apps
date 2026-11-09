import { type DbOrTx, and, asc, eq, isNull, schema } from "@sanitation/db"

import { DomainError } from "./errors"

const { service } = schema

export type ServiceInput = {
  name: string
  description: string
  durationHours: number
  priceGel: number
}

type InCompany = { companyId: string }

/** Standard Services in display order; Archived ones only when asked for. */
export async function listServices(db: DbOrTx, input: InCompany & { includeArchived: boolean }) {
  return db
    .select()
    .from(service)
    .where(
      and(
        eq(service.companyId, input.companyId),
        input.includeArchived ? undefined : isNull(service.archivedAt)
      )
    )
    .orderBy(asc(service.archivedAt), asc(service.sortOrder), asc(service.createdAt))
}

export async function getService(db: DbOrTx, input: InCompany & { serviceId: string }) {
  const [row] = await db
    .select()
    .from(service)
    .where(and(eq(service.id, input.serviceId), eq(service.companyId, input.companyId)))
  return row ?? null
}

export async function createService(
  db: DbOrTx,
  input: InCompany & ServiceInput
): Promise<{ serviceId: string }> {
  const [row] = await db.insert(service).values(input).returning({ id: service.id })
  if (row === undefined) throw new Error("Failed to create service")
  return { serviceId: row.id }
}

/** Existing Bookings keep the Duration and Booking Price they were made with. */
export async function updateService(db: DbOrTx, input: InCompany & ServiceInput & { serviceId: string }) {
  const { serviceId, companyId, ...values } = input
  const rows = await db
    .update(service)
    .set(values)
    .where(and(eq(service.id, serviceId), eq(service.companyId, companyId)))
    .returning({ id: service.id })
  if (rows.length === 0) throw new DomainError("NOT_FOUND")
}

export async function setServiceArchived(
  db: DbOrTx,
  input: InCompany & { serviceId: string; archived: boolean; now: Date }
) {
  const rows = await db
    .update(service)
    .set({ archivedAt: input.archived ? input.now : null })
    .where(and(eq(service.id, input.serviceId), eq(service.companyId, input.companyId)))
    .returning({ id: service.id })
  if (rows.length === 0) throw new DomainError("NOT_FOUND")
}
