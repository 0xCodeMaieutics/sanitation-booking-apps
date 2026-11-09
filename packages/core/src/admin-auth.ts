import { type Db, and, eq, gt, schema } from "@sanitation/db"

import { DomainError } from "./errors"
import { clientMessages } from "./messages"
import type { Notifier } from "./notifier"
import { normalizePhone } from "./phone"
import { createToken, sha256 } from "./tokens"
import { checkVerificationCode, consumeVerification, requestVerificationCode } from "./verification"

const { adminSession } = schema

export const ADMIN_SESSION_DAYS = 30

/** Sends a sign-in code to the Admin phone. Any other number is refused. */
export async function requestAdminSignInCode(
  db: Db,
  notify: Notifier,
  input: { phone: string; adminPhone: string; ipAddress: string | null; now: Date }
): Promise<{ verificationId: string }> {
  const phone = normalizePhone(input.phone)
  if (phone !== normalizePhone(input.adminPhone)) throw new DomainError("NOT_ADMIN_PHONE")
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
    await consumeVerification(tx, { ...input, phone, purpose: "admin_sign_in" })
    await tx.insert(adminSession).values({ tokenHash: hash, userAgent: input.userAgent, expiresAt })
  })
  return { token, expiresAt }
}

export async function findAdminSession(db: Db, input: { token: string; now: Date }) {
  const [row] = await db
    .select({ id: adminSession.id, expiresAt: adminSession.expiresAt })
    .from(adminSession)
    .where(and(eq(adminSession.tokenHash, sha256(input.token)), gt(adminSession.expiresAt, input.now)))
  return row ?? null
}

export async function signOutAdmin(db: Db, input: { token: string }): Promise<void> {
  await db.delete(adminSession).where(eq(adminSession.tokenHash, sha256(input.token)))
}
