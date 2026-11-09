import { type Db, type DbOrTx, and, asc, eq, isUniqueViolation, schema, sql } from "@sanitation/db"

import { DomainError } from "./errors"
import type { Notifier } from "./notifier"
import { normalizePhone } from "./phone"

const { adminPhone, company } = schema

export async function listAdminPhones(db: DbOrTx, input: { companyId: string }) {
  return db
    .select({ id: adminPhone.id, phone: adminPhone.phone, alerts: adminPhone.alerts })
    .from(adminPhone)
    .where(eq(adminPhone.companyId, input.companyId))
    .orderBy(asc(adminPhone.createdAt))
}

/** Sends an Admin Alert to every Admin Phone of the Company that has alerts on. */
export async function alertAdmins(
  db: DbOrTx,
  notify: Notifier,
  input: { companyId: string; body: string }
): Promise<void> {
  const phones = await db
    .select({ phone: adminPhone.phone })
    .from(adminPhone)
    .where(and(eq(adminPhone.companyId, input.companyId), eq(adminPhone.alerts, true)))
  await notify.admin(
    phones.map((p) => p.phone),
    input.body
  )
}

export async function addAdminPhone(
  db: DbOrTx,
  input: { companyId: string; phone: string; alerts: boolean }
): Promise<{ adminPhoneId: string }> {
  const phone = normalizePhone(input.phone)
  try {
    const [row] = await db
      .insert(adminPhone)
      .values({ companyId: input.companyId, phone, alerts: input.alerts })
      .returning({ id: adminPhone.id })
    if (row === undefined) throw new Error("Failed to add admin phone")
    return { adminPhoneId: row.id }
  } catch (error) {
    if (isUniqueViolation(error, "admin_phone_phone_unique")) throw new DomainError("PHONE_TAKEN")
    throw error
  }
}

/**
 * Applies `change` to the Company's Admin Phones, then refuses it if no Admin Phone,
 * or none with alerts on, would be left.
 */
async function changeAdminPhones(db: Db, companyId: string, change: (tx: DbOrTx) => Promise<number>) {
  await db.transaction(async (tx) => {
    // Serialises changes to one Company's Admin Phones, so two Admins cannot each remove the other's last one.
    await tx.select({ id: company.id }).from(company).where(eq(company.id, companyId)).for("update")
    if ((await change(tx)) === 0) throw new DomainError("NOT_FOUND")
    const [left] = await tx
      .select({
        phones: sql<number>`count(*)::int`,
        alerting: sql<number>`count(*) filter (where ${adminPhone.alerts})::int`,
      })
      .from(adminPhone)
      .where(eq(adminPhone.companyId, companyId))
    if ((left?.phones ?? 0) === 0) throw new DomainError("LAST_ADMIN_PHONE")
    if ((left?.alerting ?? 0) === 0) throw new DomainError("LAST_ALERT_PHONE")
  })
}

/** Removing an Admin Phone signs out every device that signed in with it. */
export async function removeAdminPhone(db: Db, input: { companyId: string; adminPhoneId: string }) {
  await changeAdminPhones(db, input.companyId, async (tx) => {
    const rows = await tx
      .delete(adminPhone)
      .where(and(eq(adminPhone.id, input.adminPhoneId), eq(adminPhone.companyId, input.companyId)))
      .returning({ id: adminPhone.id })
    return rows.length
  })
}

export async function setAdminPhoneAlerts(
  db: Db,
  input: { companyId: string; adminPhoneId: string; alerts: boolean }
) {
  await changeAdminPhones(db, input.companyId, async (tx) => {
    const rows = await tx
      .update(adminPhone)
      .set({ alerts: input.alerts })
      .where(and(eq(adminPhone.id, input.adminPhoneId), eq(adminPhone.companyId, input.companyId)))
      .returning({ id: adminPhone.id })
    return rows.length
  })
}
