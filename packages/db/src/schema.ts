import { sql } from "drizzle-orm"
import {
  check,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}

/** The Admin's settings. A single row; no row means the defaults. */
export const settings = pgTable(
  "settings",
  {
    id: smallint().primaryKey().default(1),
    minNoticeHours: smallint().notNull().default(2),
    /** ISO weekdays, 1 = Monday … 7 = Sunday. */
    workingDays: smallint()
      .array()
      .notNull()
      .default(sql`'{1,2,3,4,5,6,7}'`),
    ...timestamps,
  },
  (t) => [
    check("settings_single_row", sql`${t.id} = 1`),
    check("settings_min_notice", sql`${t.minNoticeHours} between 0 and 72`),
  ]
)

export const service = pgTable(
  "service",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    description: text().notNull().default(""),
    durationHours: smallint().notNull(),
    priceGel: integer().notNull(),
    sortOrder: integer().notNull().default(0),
    archivedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    check("service_duration", sql`${t.durationHours} between 1 and 12`),
    check("service_price", sql`${t.priceGel} >= 0`),
  ]
)

export const bookingStatus = pgEnum("booking_status", ["booked", "completed", "cancelled"])
export const actor = pgEnum("actor", ["client", "admin"])

export const callbackRequestStatus = pgEnum("callback_request_status", ["pending", "accepted", "declined"])

export const callbackRequest = pgTable(
  "callback_request",
  {
    id: uuid().primaryKey().defaultRandom(),
    phone: text().notNull(),
    clientName: text().notNull().default(""),
    /** The job in the Client's own words: a Custom Service, or "other" on a Paused Day. */
    description: text().notNull().default(""),
    address: text().notNull().default(""),
    note: text().notNull().default(""),
    /** Set when made by choosing a Custom Service; while Pending, it pauses that day. */
    desiredStartsAt: timestamp({ withTimezone: true }),
    status: callbackRequestStatus().notNull().default("pending"),
    decidedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index().on(t.status, t.desiredStartsAt),
    uniqueIndex("callback_request_one_pending_pause_per_phone")
      .on(t.phone)
      .where(sql`${t.status} = 'pending' and ${t.desiredStartsAt} is not null`),
  ]
)

/** Standard Services a Client ticked on a Paused Day's Callback Request form. */
export const callbackRequestService = pgTable(
  "callback_request_service",
  {
    callbackRequestId: uuid().notNull(),
    serviceId: uuid()
      .notNull()
      .references(() => service.id),
  },
  (t) => [
    primaryKey({ columns: [t.callbackRequestId, t.serviceId] }),
    foreignKey({
      name: "callback_request_service_request_fk",
      columns: [t.callbackRequestId],
      foreignColumns: [callbackRequest.id],
    }).onDelete("cascade"),
  ]
)

export const booking = pgTable(
  "booking",
  {
    id: uuid().primaryKey().defaultRandom(),
    /** Null for a Custom Service, which is described in `customService` instead. */
    serviceId: uuid().references(() => service.id),
    customService: text(),
    startsAt: timestamp({ withTimezone: true }).notNull(),
    /** The Service's Duration when booked, or the Admin's Estimated Duration for a Custom Service. */
    durationHours: smallint().notNull(),
    /** Booking Price in lari; for the Admin only. */
    priceGel: integer(),
    status: bookingStatus().notNull().default("booked"),
    clientName: text().notNull(),
    phone: text().notNull(),
    address: text().notNull(),
    note: text().notNull().default(""),
    createdBy: actor().notNull(),
    callbackRequestId: uuid()
      .unique()
      .references(() => callbackRequest.id),
    manageTokenHash: text().notNull().unique(),
    /** When it was Completed or Cancelled; it stops occupying time from then. */
    endedAt: timestamp({ withTimezone: true }),
    cancelledBy: actor(),
    ...timestamps,
  },
  (t) => [
    index().on(t.startsAt),
    check("booking_service_or_custom", sql`(${t.serviceId} is null) <> (${t.customService} is null)`),
    check("booking_duration", sql`${t.durationHours} between 1 and 12`),
    check("booking_price", sql`${t.priceGel} is null or ${t.priceGel} >= 0`),
    check("booking_ended", sql`(${t.status} = 'booked') = (${t.endedAt} is null)`),
    check("booking_cancelled_by", sql`(${t.status} = 'cancelled') = (${t.cancelledBy} is not null)`),
  ]
)

export const timeOff = pgTable(
  "time_off",
  {
    id: uuid().primaryKey().defaultRandom(),
    startsAt: timestamp({ withTimezone: true }).notNull(),
    endsAt: timestamp({ withTimezone: true }).notNull(),
    note: text().notNull().default(""),
    ...timestamps,
  },
  (t) => [index().on(t.startsAt), check("time_off_range", sql`${t.endsAt} > ${t.startsAt}`)]
)

export const verificationPurpose = pgEnum("verification_purpose", ["client", "admin_sign_in"])

export const phoneVerification = pgTable(
  "phone_verification",
  {
    id: uuid().primaryKey().defaultRandom(),
    purpose: verificationPurpose().notNull(),
    phone: text().notNull(),
    codeHash: text().notNull(),
    attempts: smallint().notNull().default(0),
    ipAddress: text(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    verifiedAt: timestamp({ withTimezone: true }),
    /** Set once a Booking, Callback Request or Admin session has used it. */
    consumedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.phone, t.createdAt), index().on(t.ipAddress, t.createdAt)]
)

export const adminSession = pgTable("admin_session", {
  id: uuid().primaryKey().defaultRandom(),
  tokenHash: text().notNull().unique(),
  userAgent: text().notNull().default(""),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
})
