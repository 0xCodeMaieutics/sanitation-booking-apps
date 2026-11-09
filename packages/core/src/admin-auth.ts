import { type Db, type DbOrTx, and, eq, gt, schema } from "@sanitation/db"

import { DomainError } from "./errors"
import { clientMessages } from "./messages"
import type { Notifier } from "./notifier"
import { normalizePhone } from "./phone"
import { createToken, sha256 } from "./tokens"
import { checkVerificationCode, consumeVerification, requestVerificationCode } from "./verification"

const { adminPhone, adminSession, company } = schema

export const ADMIN_SESSION_DAYS = 30

async function findAdminPhone(db: DbOrTx, phone: string) {
  const [row] = await db.select({ id: adminPhone.id }).from(adminPhone).where(eq(adminPhone.phone, phone))
  return row ?? null
}

/** Sends a sign-in code to an Admin Phone. Any other number is refused. */
export async function requestAdminSignInCode(
  db: Db,
  notify: Notifier,
  input: { phone: string; ipAddress: string | null; now: Date }
): Promise<{ verificationId: string }> {
  const phone = normalizePhone(input.phone)
  if ((await findAdminPhone(db, phone)) === null) throw new DomainError("NOT_ADMIN_PHONE")
  const { verificationId, code } = await requestVerificationCode(db, {
    purpose: "admin_sign_in",
    phone,
    ipAddress: input.ipAddress,
    now: input.now,
  })
  await notify.sendCode(phone, clientMessages.verificationCode(code))
  return { verificationId }
}

/** Starts an Admin session on this device; returns the token for its cookie. */
export async function signInAdmin(
  db: Db,
  input: { verificationId: string; phone: string; code: string; userAgent: string; now: Date }
): Promise<{ token: string; expiresAt: Date }> {
  const phone = normalizePhone(input.phone)
  await checkVerificationCode(db, { ...input, phone, purpose: "admin_sign_in" })
  const { token, hash } = createToken(32)
  const expiresAt = new Date(input.now.getTime() + ADMIN_SESSION_DAYS * 86_400_000)
  await db.transaction(async (tx) => {
    const found = await findAdminPhone(tx, phone)
    if (found === null) throw new DomainError("NOT_ADMIN_PHONE")
    await consumeVerification(tx, { ...input, phone, purpose: "admin_sign_in" })
    await tx
      .insert(adminSession)
      .values({ adminPhoneId: found.id, tokenHash: hash, userAgent: input.userAgent, expiresAt })
  })
  return { token, expiresAt }
}

export type AdminSession = NonNullable<Awaited<ReturnType<typeof findAdminSession>>>

/** The signed-in Admin: which Admin Phone they used and which Company it belongs to. */
export async function findAdminSession(db: DbOrTx, input: { token: string; now: Date }) {
  const [row] = await db
    .select({
      sessionId: adminSession.id,
      expiresAt: adminSession.expiresAt,
      adminPhoneId: adminPhone.id,
      companyId: company.id,
      companyName: company.name,
      companySlug: company.slug,
      suspended: company.suspendedAt,
    })
    .from(adminSession)
    .innerJoin(adminPhone, eq(adminPhone.id, adminSession.adminPhoneId))
    .innerJoin(company, eq(company.id, adminPhone.companyId))
    .where(and(eq(adminSession.tokenHash, sha256(input.token)), gt(adminSession.expiresAt, input.now)))
  if (row === undefined) return null
  const { suspended, ...rest } = row
  return { ...rest, suspended: suspended !== null }
}

export async function signOutAdmin(db: Db, input: { token: string }): Promise<void> {
  await db.delete(adminSession).where(eq(adminSession.tokenHash, sha256(input.token)))
}
