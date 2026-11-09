import {
  type Db,
  type DbOrTx,
  and,
  eq,
  inArray,
  isNull,
  isUniqueViolation,
  schema,
  sql,
} from "@sanitation/db"

import { alertAdmins } from "./admin-phones"
import { dayStatus, isAvailableStartTime, isInBookingWindow } from "./availability"
import type { Messaging } from "./bookings"
import { loadCalendar, lockCalendar } from "./calendar"
import { getActiveCompany, getCompany } from "./companies"
import { DomainError } from "./errors"
import { adminAlerts, clientMessages } from "./messages"
import { normalizePhone } from "./phone"
import { type LocalDate, toLocalDate } from "./time"
import { checkVerificationCode, consumeVerification } from "./verification"

const { callbackRequest, callbackRequestService, service } = schema

type Verified = { verificationId: string; code: string }

/** A Client asking for a Custom Service at a desired start time. While Pending, it pauses that day. */
export async function createCustomRequest(
  db: Db,
  m: Messaging,
  input: Verified & {
    companyId: string
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
    await lockCalendar(tx, input.companyId)
    await getActiveCompany(tx, input.companyId)
    const date = toLocalDate(input.desiredStartsAt)
    const calendar = await loadCalendar(tx, {
      companyId: input.companyId,
      from: date,
      to: date,
      now: input.now,
    })
    if (calendar.pausedDates.has(date)) throw new DomainError("DAY_PAUSED")
    if (!isAvailableStartTime(calendar, input.desiredStartsAt, null))
      throw new DomainError("START_UNAVAILABLE")

    await consumeVerification(tx, { ...input, phone, purpose: "client" })
    try {
      const [row] = await tx
        .insert(callbackRequest)
        .values({
          companyId: input.companyId,
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

  await alertAdmins(db, m.notify, {
    companyId: input.companyId,
    body: adminAlerts.customRequest({ desiredStartsAt: input.desiredStartsAt, phone }),
  })
  return { callbackRequestId }
}

/**
 * A Client on a Paused Day asking to be called back about the Services they want. While Pending,
 * it keeps that day paused, so nobody books it before the Admin has reviewed the request.
 */
export async function createPausedDayRequest(
  db: Db,
  m: Messaging,
  input: Verified & {
    companyId: string
    date: LocalDate
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
    await lockCalendar(tx, input.companyId)
    await getActiveCompany(tx, input.companyId)
    const calendar = await loadCalendar(tx, {
      companyId: input.companyId,
      from: input.date,
      to: input.date,
      now: input.now,
    })
    // The day may have reopened while the Client filled in the form; their request still pauses it.
    if (!isInBookingWindow(input.date, input.now) || dayStatus(calendar, input.date) === "closed") {
      throw new DomainError("INVALID_STATE")
    }

    await consumeVerification(tx, { ...input, phone, purpose: "client" })
    const [row] = await tx
      .insert(callbackRequest)
      .values({
        companyId: input.companyId,
        phone,
        clientName: input.clientName,
        description: input.description,
        note: input.note,
        pausedDate: input.date,
      })
      .returning({ id: callbackRequest.id })
      .catch((error: unknown) => {
        if (isUniqueViolation(error, "callback_request_one_pending_pause_per_phone")) {
          throw new DomainError("PENDING_REQUEST_EXISTS")
        }
        throw error
      })
    if (row === undefined) throw new Error("Failed to create callback request")
    const serviceIds = [...new Set(input.serviceIds)]
    if (serviceIds.length > 0) {
      const known = await tx
        .select({ id: service.id })
        .from(service)
        .where(
          and(
            inArray(service.id, serviceIds),
            eq(service.companyId, input.companyId),
            isNull(service.archivedAt)
          )
        )
      if (known.length > 0) {
        await tx
          .insert(callbackRequestService)
          .values(known.map((s) => ({ callbackRequestId: row.id, serviceId: s.id })))
      }
    }
    return row.id
  })

  await alertAdmins(db, m.notify, {
    companyId: input.companyId,
    body: adminAlerts.callbackRequest({ phone }),
  })
  return { callbackRequestId }
}

export async function declineCallbackRequest(
  db: Db,
  m: Messaging,
  input: { companyId: string; callbackRequestId: string; now: Date }
): Promise<void> {
  const rows = await db
    .update(callbackRequest)
    .set({ status: "declined", decidedAt: input.now })
    .where(
      and(
        eq(callbackRequest.id, input.callbackRequestId),
        eq(callbackRequest.companyId, input.companyId),
        eq(callbackRequest.status, "pending")
      )
    )
    .returning({ phone: callbackRequest.phone })
  const declined = rows[0]
  if (declined === undefined) throw new DomainError("INVALID_STATE")
  const c = await getCompany(db, input.companyId)
  await m.notify.client(declined.phone, clientMessages.requestDeclined(c.name))
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

/** Pending Callback Requests, oldest first, so each Paused Day's queue reads in the order Clients joined it. */
export async function listPendingCallbackRequests(db: DbOrTx, input: { companyId: string }) {
  const pending = await db
    .select()
    .from(callbackRequest)
    .where(and(eq(callbackRequest.companyId, input.companyId), eq(callbackRequest.status, "pending")))
    .orderBy(callbackRequest.createdAt)
  return withServices(db, pending)
}

export async function getCallbackRequest(
  db: DbOrTx,
  input: { companyId: string; callbackRequestId: string }
) {
  const rows = await db
    .select()
    .from(callbackRequest)
    .where(
      and(eq(callbackRequest.id, input.callbackRequestId), eq(callbackRequest.companyId, input.companyId))
    )
  const [request] = await withServices(db, rows)
  return request ?? null
}

export async function countPendingCallbackRequests(
  db: DbOrTx,
  input: { companyId: string }
): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(callbackRequest)
    .where(and(eq(callbackRequest.companyId, input.companyId), eq(callbackRequest.status, "pending")))
  return row?.n ?? 0
}
