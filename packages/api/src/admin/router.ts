import {
  type IsoWeekday,
  addDays,
  addTimeOff,
  cancelBookingByAdmin,
  completeBooking,
  countPendingCallbackRequests,
  createAdminBooking,
  createService,
  declineCallbackRequest,
  getBookingById,
  getCallbackRequest,
  getSettings,
  listBookings,
  listCallbackRequests,
  listPastBookings,
  listServices,
  listTimeOff,
  localInstant,
  maskPhone,
  normalizePhone,
  removeTimeOff,
  requestAdminSignInCode,
  setBookingPrice,
  setServiceArchived,
  signInAdmin,
  signOutAdmin,
  toLocalDate,
  updateService,
  updateSettings,
} from "@sanitation/core"
import { TRPCError } from "@trpc/server"
import { z } from "zod"

import { zAddress, zCode, zHours, zLocalDate, zName, zNote, zPhone, zPrice } from "../shared"
import { adminProcedure, createCallerFactory, publicProcedure, router } from "./trpc"

const zServiceInput = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(300),
  durationHours: zHours,
  priceGel: zPrice,
})

const zAdminBooking = z.object({
  service: z.union([
    z.object({ serviceId: z.uuid() }),
    z.object({ customService: z.string().trim().min(2).max(300) }),
  ]),
  date: zLocalDate,
  hour: z.number().int().min(0).max(23),
  durationHours: zHours.optional(),
  priceGel: zPrice.nullable().optional(),
  clientName: zName,
  phone: zPhone,
  address: zAddress,
  note: zNote,
  allowOverlap: z.boolean(),
})

const authRouter = router({
  /** The masked Admin phone, shown on the sign-in screen. */
  phoneHint: publicProcedure.query(({ ctx }) => maskPhone(normalizePhone(ctx.adminPhone))),

  sendCode: publicProcedure.input(z.object({ phone: zPhone })).mutation(({ ctx, input }) =>
    requestAdminSignInCode(ctx.db, ctx.messaging.notify, {
      phone: input.phone,
      adminPhone: ctx.adminPhone,
      ipAddress: ctx.ipAddress,
      now: ctx.now(),
    })
  ),

  signIn: publicProcedure
    .input(z.object({ phone: zPhone, verificationId: z.uuid(), code: zCode }))
    .mutation(async ({ ctx, input }) => {
      const { token, expiresAt } = await signInAdmin(ctx.db, {
        ...input,
        userAgent: ctx.userAgent,
        now: ctx.now(),
      })
      ctx.session.set(token, expiresAt)
      return { ok: true as const }
    }),

  signOut: publicProcedure.mutation(async ({ ctx }) => {
    const token = ctx.session.get()
    if (token !== null) await signOutAdmin(ctx.db, { token })
    ctx.session.clear()
    return { ok: true as const }
  }),

  /** Whether this device has a valid Admin session. */
  check: adminProcedure.query(() => ({ ok: true as const })),
})

const bookingsRouter = router({
  /** Everything still Booked, plus today's Completed and Cancelled ones. */
  upcoming: adminProcedure.query(({ ctx }) =>
    listBookings(ctx.db, { since: localInstant(toLocalDate(ctx.now())) })
  ),

  past: adminProcedure.query(({ ctx }) =>
    listPastBookings(ctx.db, { before: localInstant(toLocalDate(ctx.now())), limit: 100 })
  ),

  byId: adminProcedure.input(z.object({ bookingId: z.uuid() })).query(async ({ ctx, input }) => {
    const b = await getBookingById(ctx.db, input.bookingId)
    if (b === null) throw new TRPCError({ code: "NOT_FOUND" })
    return b
  }),

  create: adminProcedure
    .input(zAdminBooking.extend({ callbackRequestId: z.uuid().optional() }))
    .mutation(({ ctx, input }) => {
      const { date, hour, ...rest } = input
      return createAdminBooking(ctx.db, ctx.messaging, {
        ...rest,
        startsAt: localInstant(date, hour),
        now: ctx.now(),
      })
    }),

  complete: adminProcedure.input(z.object({ bookingId: z.uuid() })).mutation(async ({ ctx, input }) => {
    await completeBooking(ctx.db, { bookingId: input.bookingId, now: ctx.now() })
    return { ok: true as const }
  }),

  cancel: adminProcedure.input(z.object({ bookingId: z.uuid() })).mutation(async ({ ctx, input }) => {
    await cancelBookingByAdmin(ctx.db, ctx.messaging, { bookingId: input.bookingId, now: ctx.now() })
    return { ok: true as const }
  }),

  setPrice: adminProcedure
    .input(z.object({ bookingId: z.uuid(), priceGel: zPrice.nullable() }))
    .mutation(async ({ ctx, input }) => {
      await setBookingPrice(ctx.db, input)
      return { ok: true as const }
    }),
})

const callbackRequestsRouter = router({
  list: adminProcedure.query(({ ctx }) => listCallbackRequests(ctx.db, { decidedLimit: 30 })),

  pendingCount: adminProcedure.query(({ ctx }) => countPendingCallbackRequests(ctx.db)),

  byId: adminProcedure.input(z.object({ callbackRequestId: z.uuid() })).query(async ({ ctx, input }) => {
    const r = await getCallbackRequest(ctx.db, input.callbackRequestId)
    if (r === null) throw new TRPCError({ code: "NOT_FOUND" })
    return r
  }),

  decline: adminProcedure
    .input(z.object({ callbackRequestId: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      await declineCallbackRequest(ctx.db, ctx.messaging, { ...input, now: ctx.now() })
      return { ok: true as const }
    }),
})

const servicesRouter = router({
  list: adminProcedure.query(({ ctx }) => listServices(ctx.db, { includeArchived: true })),

  create: adminProcedure.input(zServiceInput).mutation(({ ctx, input }) => createService(ctx.db, input)),

  update: adminProcedure
    .input(zServiceInput.extend({ serviceId: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      await updateService(ctx.db, input)
      return { ok: true as const }
    }),

  setArchived: adminProcedure
    .input(z.object({ serviceId: z.uuid(), archived: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await setServiceArchived(ctx.db, { ...input, now: ctx.now() })
      return { ok: true as const }
    }),
})

const timeOffRouter = router({
  list: adminProcedure.query(({ ctx }) => listTimeOff(ctx.db, { now: ctx.now() })),

  add: adminProcedure
    .input(
      z.object({
        date: zLocalDate,
        fromHour: z.number().int().min(0).max(23).nullable(),
        toHour: z.number().int().min(1).max(24).nullable(),
        note: z.string().trim().max(200),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.date < toLocalDate(ctx.now()) || input.date > addDays(toLocalDate(ctx.now()), 366)) {
        throw new TRPCError({ code: "BAD_REQUEST" })
      }
      await addTimeOff(ctx.db, input)
      return { ok: true as const }
    }),

  remove: adminProcedure.input(z.object({ timeOffId: z.uuid() })).mutation(async ({ ctx, input }) => {
    await removeTimeOff(ctx.db, input)
    return { ok: true as const }
  }),
})

const settingsRouter = router({
  get: adminProcedure.query(({ ctx }) => getSettings(ctx.db)),

  update: adminProcedure
    .input(
      z.object({
        minNoticeHours: z.number().int().min(0).max(72),
        workingDays: z.array(z.number().int().min(1).max(7)).min(1).max(7),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await updateSettings(ctx.db, {
        minNoticeHours: input.minNoticeHours,
        workingDays: input.workingDays as IsoWeekday[],
      })
      return { ok: true as const }
    }),
})

export const adminRouter = router({
  auth: authRouter,
  bookings: bookingsRouter,
  callbackRequests: callbackRequestsRouter,
  services: servicesRouter,
  timeOff: timeOffRouter,
  settings: settingsRouter,
})

export type AdminRouter = typeof adminRouter
export type { AdminContext, SessionCookie } from "./trpc"
export const createAdminCaller = createCallerFactory(adminRouter)
