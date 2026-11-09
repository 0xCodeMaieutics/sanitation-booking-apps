import {
  type Db,
  type DbOrTx,
  and,
  desc,
  eq,
  inArray,
  isNull,
  isUniqueViolation,
  ne,
  schema,
  sql,
} from "@sanitation/db"

import { isAvailableStartTime } from "./availability"
import type { Messaging } from "./bookings"
import { loadCalendar, lockCalendar } from "./calendar"
import { DomainError } from "./errors"
import { adminAlerts, clientMessages } from "./messages"
import { normalizePhone } from "./phone"
import { toLocalDate } from "./time"
import { checkVerificationCode, consumeVerification } from "./verification"

const { callbackRequest, callbackRequestService, service } = schema

type Verified = { verificationId: string; code: string }

/** A Client asking for a Custom Service at a desired start time. While Pending, it pauses that day. */
export async function createCustomRequest(
  db: Db,
  m: Messaging,
  input: Verified & {
    description: string
    address: string
    desiredStartsAt: Date
    clientName: string
    phone: string
    note: string
    now: Date
  }
): Promise<{ callbackRequestId: string }> {
  const phone = normalizePhone(input.phone)
  await checkVerificationCode(db, { ...input, phone, purpose: "client" })

  const callbackRequestId = await db.transaction(async (tx) => {
    await lockCalendar(tx)
    const date = toLocalDate(input.desiredStartsAt)
    const calendar = await loadCalendar(tx, { from: date, to: date, now: input.now })
    if (calendar.pausedDates.has(date)) throw new DomainError("DAY_PAUSED")
    if (!isAvailableStartTime(calendar, input.desiredStartsAt, null))
      throw new DomainError("START_UNAVAILABLE")

    await consumeVerification(tx, { ...input, phone, purpose: "client" })
    try {
      const [row] = await tx
        .insert(callbackRequest)
        .values({
          phone,
          clientName: input.clientName,
          description: input.description,
          address: input.address,
          note: input.note,
          desiredStartsAt: input.desiredStartsAt,
        })
        .returning({ id: callbackRequest.id })
      if (row === undefined) throw new Error("Failed to create callback request")
      return row.id
    } catch (error) {
      if (isUniqueViolation(error, "callback_request_one_pending_pause_per_phone")) {
        throw new DomainError("PENDING_REQUEST_EXISTS")
      }
      throw error
    }
  })

  await m.notify.admin(adminAlerts.customRequest({ desiredStartsAt: input.desiredStartsAt, phone }))
  return { callbackRequestId }
}

/** A Client on a Paused Day asking to be called back about the Services they want. */
export async function createPausedDayRequest(
  db: Db,
  m: Messaging,
  input: Verified & {
    serviceIds: string[]
    description: string
    clientName: string
    phone: string
    note: string
    now: Date
  }
): Promise<{ callbackRequestId: string }> {
  const phone = normalizePhone(input.phone)
  await checkVerificationCode(db, { ...input, phone, purpose: "client" })

  const callbackRequestId = await db.transaction(async (tx) => {
    await consumeVerification(tx, { ...input, phone, purpose: "client" })
    const [row] = await tx
      .insert(callbackRequest)
      .values({ phone, clientName: input.clientName, description: input.description, note: input.note })
      .returning({ id: callbackRequest.id })
    if (row === undefined) throw new Error("Failed to create callback request")
    const serviceIds = [...new Set(input.serviceIds)]
    if (serviceIds.length > 0) {
      const known = await tx
        .select({ id: service.id })
        .from(service)
        .where(and(inArray(service.id, serviceIds), isNull(service.archivedAt)))
      if (known.length > 0) {
        await tx
          .insert(callbackRequestService)
          .values(known.map((s) => ({ callbackRequestId: row.id, serviceId: s.id })))
      }
    }
    return row.id
  })

  await m.notify.admin(adminAlerts.callbackRequest({ phone }))
  return { callbackRequestId }
}

export async function declineCallbackRequest(
  db: Db,
  m: Messaging,
  input: { callbackRequestId: string; now: Date }
): Promise<void> {
  const rows = await db
    .update(callbackRequest)
    .set({ status: "declined", decidedAt: input.now })
    .where(and(eq(callbackRequest.id, input.callbackRequestId), eq(callbackRequest.status, "pending")))
    .returning({ phone: callbackRequest.phone })
  const declined = rows[0]
  if (declined === undefined) throw new DomainError("INVALID_STATE")
  await m.notify.client(declined.phone, clientMessages.requestDeclined())
}

async function withServices<T extends { id: string }>(db: DbOrTx, requests: T[]) {
  const ids = requests.map((r) => r.id)
  const links =
    ids.length === 0
      ? []
      : await db
          .select({
            callbackRequestId: callbackRequestService.callbackRequestId,
            serviceId: service.id,
            name: service.name,
          })
          .from(callbackRequestService)
          .innerJoin(service, eq(service.id, callbackRequestService.serviceId))
          .where(inArray(callbackRequestService.callbackRequestId, ids))
  return requests.map((r) => ({
    ...r,
    services: links
      .filter((l) => l.callbackRequestId === r.id)
      .map((l) => ({ id: l.serviceId, name: l.name })),
  }))
}

/** Pending Callback Requests first (soonest desired time first), then recently decided ones. */
export async function listCallbackRequests(db: DbOrTx, input: { decidedLimit: number }) {
  const pending = await db
    .select()
    .from(callbackRequest)
    .where(eq(callbackRequest.status, "pending"))
    .orderBy(sql`${callbackRequest.desiredStartsAt} asc nulls last`, callbackRequest.createdAt)
  const decided = await db
    .select()
    .from(callbackRequest)
    .where(ne(callbackRequest.status, "pending"))
    .orderBy(desc(callbackRequest.decidedAt))
    .limit(input.decidedLimit)
  return { pending: await withServices(db, pending), decided: await withServices(db, decided) }
}

export async function getCallbackRequest(db: DbOrTx, id: string) {
  const rows = await db.select().from(callbackRequest).where(eq(callbackRequest.id, id))
  const [request] = await withServices(db, rows)
  return request ?? null
}

export async function countPendingCallbackRequests(db: DbOrTx): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(callbackRequest)
    .where(eq(callbackRequest.status, "pending"))
  return row?.n ?? 0
}
