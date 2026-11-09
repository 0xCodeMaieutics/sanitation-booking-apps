import { type Db, type DbOrTx, and, count, eq, gte, gt, isNotNull, isNull, schema, sql } from "@sanitation/db"

import { DomainError } from "./errors"
import { clientMessages } from "./messages"
import type { Notifier } from "./notifier"
import { normalizePhone } from "./phone"
import { createVerificationCode, hashVerificationCode, safeEqualHex } from "./tokens"

const { phoneVerification } = schema

export type VerificationPurpose = "client" | "admin_sign_in"

const CODE_VALID_MINUTES = 10
const MAX_ATTEMPTS = 5
/** How long after entering the code the Booking or sign-in may still use it. */
const VERIFIED_FOR_MINUTES = 20
/** A new code for the same phone needs this long since the last one. */
export const RESEND_COOLDOWN_SECONDS = 60

const LIMITS = { perPhoneDay: 10, perIpHour: 10 }

/** Creates a one-time code for a phone, enforcing rate limits. The caller sends the code. */
export async function requestVerificationCode(
  db: Db,
  input: { purpose: VerificationPurpose; phone: string; ipAddress: string | null; now: Date }
): Promise<{ verificationId: string; code: string }> {
  const ago = (minutes: number) => new Date(input.now.getTime() - minutes * 60_000)
  const countSince = async (field: "phone" | "ipAddress", value: string, since: Date) => {
    const [row] = await db
      .select({ n: count() })
      .from(phoneVerification)
      .where(and(eq(phoneVerification[field], value), gte(phoneVerification.createdAt, since)))
    return row?.n ?? 0
  }

  if (process.env.NODE_ENV !== "development") {
    const limited =
      (await countSince("phone", input.phone, ago(RESEND_COOLDOWN_SECONDS / 60))) > 0 ||
      (await countSince("phone", input.phone, ago(24 * 60))) >= LIMITS.perPhoneDay ||
      (input.ipAddress !== null &&
        (await countSince("ipAddress", input.ipAddress, ago(60))) >= LIMITS.perIpHour)
    if (limited) throw new DomainError("RATE_LIMITED")
  }

  const code = createVerificationCode()
  const [row] = await db
    .insert(phoneVerification)
    .values({
      purpose: input.purpose,
      phone: input.phone,
      codeHash: hashVerificationCode(input.phone, code),
      ipAddress: input.ipAddress,
      expiresAt: new Date(input.now.getTime() + CODE_VALID_MINUTES * 60_000),
      createdAt: input.now,
    })
    .returning({ id: phoneVerification.id })
  if (row === undefined) throw new Error("Failed to create verification")
  return { verificationId: row.id, code }
}

/**
 * Checks a typed code. Wrong codes count towards the attempt limit, so call this
 * outside the transaction that later consumes the verification.
 */
export async function checkVerificationCode(
  db: Db,
  input: { verificationId: string; purpose: VerificationPurpose; phone: string; code: string; now: Date }
): Promise<void> {
  const [v] = await db.select().from(phoneVerification).where(eq(phoneVerification.id, input.verificationId))
  if (
    v === undefined ||
    v.purpose !== input.purpose ||
    v.phone !== input.phone ||
    v.consumedAt !== null ||
    v.expiresAt < input.now ||
    v.attempts >= MAX_ATTEMPTS
  ) {
    throw new DomainError("INVALID_CODE")
  }
  if (v.verifiedAt !== null) return

  if (!safeEqualHex(v.codeHash, hashVerificationCode(input.phone, input.code.trim()))) {
    await db
      .update(phoneVerification)
      .set({ attempts: sql`${phoneVerification.attempts} + 1` })
      .where(eq(phoneVerification.id, v.id))
    throw new DomainError("INVALID_CODE")
  }
  await db.update(phoneVerification).set({ verifiedAt: input.now }).where(eq(phoneVerification.id, v.id))
}

/** Sends a Client their Verification Code before a Booking or Callback Request. */
export async function sendClientCode(
  db: Db,
  notify: Notifier,
  input: { phone: string; ipAddress: string | null; now: Date }
): Promise<{ verificationId: string; phone: string }> {
  const phone = normalizePhone(input.phone)
  const { verificationId, code } = await requestVerificationCode(db, { ...input, phone, purpose: "client" })
  await notify.sendCode(phone, clientMessages.verificationCode(code))
  return { verificationId, phone }
}

/** Marks a checked verification as used, so one code makes exactly one Booking, request or session. */
export async function consumeVerification(
  tx: DbOrTx,
  input: { verificationId: string; purpose: VerificationPurpose; phone: string; now: Date }
): Promise<void> {
  const rows = await tx
    .update(phoneVerification)
    .set({ consumedAt: input.now })
    .where(
      and(
        eq(phoneVerification.id, input.verificationId),
        eq(phoneVerification.purpose, input.purpose),
        eq(phoneVerification.phone, input.phone),
        isNotNull(phoneVerification.verifiedAt),
        gt(phoneVerification.verifiedAt, new Date(input.now.getTime() - VERIFIED_FOR_MINUTES * 60_000)),
        isNull(phoneVerification.consumedAt)
      )
    )
    .returning({ id: phoneVerification.id })
  if (rows.length === 0) throw new DomainError("INVALID_CODE")
}
