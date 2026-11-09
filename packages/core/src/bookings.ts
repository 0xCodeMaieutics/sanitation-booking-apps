import {
  type Db,
  type DbOrTx,
  type SQL,
  and,
  asc,
  desc,
  eq,
  gte,
  isNull,
  lt,
  ne,
  or,
  schema,
} from "@sanitation/db"

import { isAvailableStartTime, overlapping } from "./availability"
import { loadCalendar, loadOccupied, lockCalendar } from "./calendar"
import { DomainError } from "./errors"
import { adminAlerts, clientMessages } from "./messages"
import type { Notifier } from "./notifier"
import { normalizePhone } from "./phone"
import { addHours, toLocalDate } from "./time"
import { createToken, sha256 } from "./tokens"
import { checkVerificationCode, consumeVerification } from "./verification"

const { booking, callbackRequest, service } = schema

export type Messaging = { notify: Notifier; appUrl: string }

export function manageUrl(appUrl: string, token: string): string {
  return `${appUrl.replace(/\/$/, "")}/b/${token}`
}

const bookingColumns = {
  id: booking.id,
  serviceId: booking.serviceId,
  serviceName: service.name,
  customService: booking.customService,
  startsAt: booking.startsAt,
  durationHours: booking.durationHours,
  priceGel: booking.priceGel,
  status: booking.status,
  clientName: booking.clientName,
  phone: booking.phone,
  address: booking.address,
  note: booking.note,
  createdBy: booking.createdBy,
  callbackRequestId: booking.callbackRequestId,
  endedAt: booking.endedAt,
  cancelledBy: booking.cancelledBy,
  createdAt: booking.createdAt,
}

function selectBookings(db: DbOrTx) {
  return db.select(bookingColumns).from(booking).leftJoin(service, eq(service.id, booking.serviceId))
}

type BookingRow = Awaited<ReturnType<typeof selectBookings>>[number]

export type BookingDetails = BookingRow & { title: string; endsAt: Date }

function withTitle(row: BookingRow): BookingDetails {
  return {
    ...row,
    title: row.serviceName ?? row.customService ?? "",
    endsAt: addHours(row.startsAt, row.durationHours),
  }
}

async function findBooking(db: DbOrTx, where: SQL): Promise<BookingDetails | null> {
  const [row] = await selectBookings(db).where(where)
  return row === undefined ? null : withTitle(row)
}

export function getBookingById(db: DbOrTx, id: string) {
  return findBooking(db, eq(booking.id, id))
}

export function getBookingByToken(db: DbOrTx, token: string) {
  return findBooking(db, eq(booking.manageTokenHash, sha256(token)))
}

/** Bookings for the Admin: everything still Booked, plus anything that started since `since`. */
export async function listBookings(db: DbOrTx, input: { since: Date }): Promise<BookingDetails[]> {
  const rows = await selectBookings(db)
    .where(or(eq(booking.status, "booked"), gte(booking.startsAt, input.since)))
    .orderBy(asc(booking.startsAt))
  return rows.map(withTitle)
}

/** The Admin's history: Bookings that started before `before`, newest first. */
export async function listPastBookings(
  db: DbOrTx,
  input: { before: Date; limit: number }
): Promise<BookingDetails[]> {
  const rows = await selectBookings(db)
    .where(and(lt(booking.startsAt, input.before), ne(booking.status, "booked")))
    .orderBy(desc(booking.startsAt))
    .limit(input.limit)
  return rows.map(withTitle)
}

async function sendConfirmation(
  m: Messaging,
  b: { title: string; startsAt: Date; phone: string },
  token: string
) {
  await m.notify.client(b.phone, clientMessages.confirmation(b, manageUrl(m.appUrl, token)))
}

/** A Client booking a Standard Service at one of its Available Start Times. */
export async function createClientBooking(
  db: Db,
  m: Messaging,
  input: {
    serviceId: string
    startsAt: Date
    clientName: string
    phone: string
    address: string
    note: string
    verificationId: string
    code: string
    now: Date
  }
): Promise<{ bookingId: string; manageToken: string }> {
  const phone = normalizePhone(input.phone)
  await checkVerificationCode(db, { ...input, phone, purpose: "client" })

  const { bookingId, manageToken, title } = await db.transaction(async (tx) => {
    await lockCalendar(tx)
    const [svc] = await tx
      .select()
      .from(service)
      .where(and(eq(service.id, input.serviceId), isNull(service.archivedAt)))
    if (svc === undefined) throw new DomainError("NOT_FOUND")

    const date = toLocalDate(input.startsAt)
    const calendar = await loadCalendar(tx, { from: date, to: date, now: input.now })
    if (calendar.pausedDates.has(date)) throw new DomainError("DAY_PAUSED")
    if (!isAvailableStartTime(calendar, input.startsAt, svc.durationHours)) {
      throw new DomainError("START_UNAVAILABLE")
    }

    await consumeVerification(tx, { ...input, phone, purpose: "client" })
    const { token, hash } = createToken()
    const [row] = await tx
      .insert(booking)
      .values({
        serviceId: svc.id,
        startsAt: input.startsAt,
        durationHours: svc.durationHours,
        priceGel: svc.priceGel,
        clientName: input.clientName,
        phone,
        address: input.address,
        note: input.note,
        createdBy: "client",
        manageTokenHash: hash,
      })
      .returning({ id: booking.id })
    if (row === undefined) throw new Error("Failed to create booking")
    return { bookingId: row.id, manageToken: token, title: svc.name }
  })

  const summary = { title, startsAt: input.startsAt }
  await sendConfirmation(m, { ...summary, phone }, manageToken)
  await m.notify.admin(adminAlerts.newBooking({ ...summary, clientName: input.clientName, phone }))
  return { bookingId, manageToken }
}

export type AdminBookingInput = {
  service: { serviceId: string } | { customService: string }
  startsAt: Date
  /** Required for a Custom Service (its Estimated Duration); defaults to the Service's Duration. */
  durationHours?: number
  /** Defaults to the Service Price. */
  priceGel?: number | null
  clientName: string
  phone: string
  address: string
  note: string
  /** The Admin has seen the overlap warning and wants the Booking anyway. */
  allowOverlap: boolean
  /** Set when accepting a Callback Request. */
  callbackRequestId?: string
  now: Date
}

/**
 * An Admin Booking: no Verification Code, Minimum Notice or Booking Window, and it may
 * overlap other Bookings or Time Off once the Admin has confirmed the warning.
 */
export async function createAdminBooking(
  db: Db,
  m: Messaging,
  input: AdminBookingInput
): Promise<{ bookingId: string }> {
  const phone = normalizePhone(input.phone)

  const { bookingId, manageToken, title } = await db.transaction(async (tx) => {
    await lockCalendar(tx)
    let name: string
    let durationHours: number
    let priceGel: number | null
    if ("serviceId" in input.service) {
      const [svc] = await tx.select().from(service).where(eq(service.id, input.service.serviceId))
      if (svc === undefined) throw new DomainError("NOT_FOUND")
      name = svc.name
      durationHours = input.durationHours ?? svc.durationHours
      priceGel = input.priceGel === undefined ? svc.priceGel : input.priceGel
    } else {
      if (input.durationHours === undefined) throw new DomainError("INVALID_STATE")
      name = input.service.customService
      durationHours = input.durationHours
      priceGel = input.priceGel ?? null
    }

    const endsAt = addHours(input.startsAt, durationHours)
    const conflicts = overlapping(await loadOccupied(tx, input.startsAt, endsAt), input.startsAt, endsAt)
    if (conflicts.length > 0 && !input.allowOverlap) throw new DomainError("OVERLAP", conflicts)

    if (input.callbackRequestId !== undefined) {
      const accepted = await tx
        .update(callbackRequest)
        .set({ status: "accepted", decidedAt: input.now })
        .where(and(eq(callbackRequest.id, input.callbackRequestId), eq(callbackRequest.status, "pending")))
        .returning({ id: callbackRequest.id })
      if (accepted.length === 0) throw new DomainError("INVALID_STATE")
    }

    const { token, hash } = createToken()
    const [row] = await tx
      .insert(booking)
      .values({
        serviceId: "serviceId" in input.service ? input.service.serviceId : null,
        customService: "customService" in input.service ? input.service.customService : null,
        startsAt: input.startsAt,
        durationHours,
        priceGel,
        clientName: input.clientName,
        phone,
        address: input.address,
        note: input.note,
        createdBy: "admin",
        callbackRequestId: input.callbackRequestId ?? null,
        manageTokenHash: hash,
      })
      .returning({ id: booking.id })
    if (row === undefined) throw new Error("Failed to create booking")
    return { bookingId: row.id, manageToken: token, title: name }
  })

  await sendConfirmation(m, { title, startsAt: input.startsAt, phone }, manageToken)
  return { bookingId }
}

async function endBooking(
  db: DbOrTx,
  where: SQL,
  set: { status: "completed" | "cancelled"; cancelledBy?: "client" | "admin" },
  now: Date
) {
  const rows = await db
    .update(booking)
    .set({ ...set, endedAt: now })
    .where(and(where, eq(booking.status, "booked")))
    .returning({ id: booking.id })
  if (rows.length === 0) throw new DomainError("INVALID_STATE")
}

export async function completeBooking(db: Db, input: { bookingId: string; now: Date }): Promise<void> {
  await endBooking(db, eq(booking.id, input.bookingId), { status: "completed" }, input.now)
}

export async function cancelBookingByAdmin(
  db: Db,
  m: Messaging,
  input: { bookingId: string; now: Date }
): Promise<void> {
  const b = await getBookingById(db, input.bookingId)
  if (b === null) throw new DomainError("NOT_FOUND")
  await endBooking(db, eq(booking.id, b.id), { status: "cancelled", cancelledBy: "admin" }, input.now)
  if (b.startsAt > input.now) await m.notify.client(b.phone, clientMessages.cancelledByAdmin(b))
}

/** A Client cancelling through their Manage Link, up to the Booking's start time. */
export async function cancelBookingByClient(
  db: Db,
  m: Messaging,
  input: { token: string; now: Date }
): Promise<void> {
  const b = await getBookingByToken(db, input.token)
  if (b === null) throw new DomainError("NOT_FOUND")
  if (b.status !== "booked") throw new DomainError("INVALID_STATE")
  if (b.startsAt <= input.now) throw new DomainError("CANCEL_TOO_LATE")
  await endBooking(db, eq(booking.id, b.id), { status: "cancelled", cancelledBy: "client" }, input.now)
  await m.notify.admin(adminAlerts.cancelledByClient(b))
}

export async function setBookingPrice(
  db: Db,
  input: { bookingId: string; priceGel: number | null }
): Promise<void> {
  const rows = await db
    .update(booking)
    .set({ priceGel: input.priceGel })
    .where(eq(booking.id, input.bookingId))
    .returning({ id: booking.id })
  if (rows.length === 0) throw new DomainError("NOT_FOUND")
}
