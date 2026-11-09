import {
  type IsoWeekday,
  addAdminPhone,
  addDays,
  addTimeOff,
  bookingLink,
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
  listAdminPhones,
  listPendingCallbackRequests,
  listPastBookings,
  listServices,
  listTimeOff,
  loadOccupied,
  localInstant,
  removeAdminPhone,
  removeTimeOff,
  requestAdminSignInCode,
  setAdminPhoneAlerts,
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
  sendCode: publicProcedure.input(z.object({ phone: zPhone })).mutation(({ ctx, input }) =>
    requestAdminSignInCode(ctx.db, ctx.messaging.notify, {
      phone: input.phone,
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

  /** The signed-in Admin's Company; fails when this device has no valid Admin session. */
  me: adminProcedure.query(({ ctx }) => ({
    adminPhoneId: ctx.admin.adminPhoneId,
    companyName: ctx.admin.companyName,
    suspended: ctx.admin.suspended,
    bookingLink: bookingLink(ctx.messaging.appUrl, ctx.admin.companySlug),
  })),
})

const adminPhonesRouter = router({
  list: adminProcedure.query(({ ctx }) => listAdminPhones(ctx.db, { companyId: ctx.companyId })),

  add: adminProcedure
    .input(z.object({ phone: zPhone, alerts: z.boolean() }))
    .mutation(({ ctx, input }) => addAdminPhone(ctx.db, { ...input, companyId: ctx.companyId })),

  remove: adminProcedure.input(z.object({ adminPhoneId: z.uuid() })).mutation(async ({ ctx, input }) => {
    await removeAdminPhone(ctx.db, { ...input, companyId: ctx.companyId })
    return { ok: true as const }
  }),

  setAlerts: adminProcedure
    .input(z.object({ adminPhoneId: z.uuid(), alerts: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await setAdminPhoneAlerts(ctx.db, { ...input, companyId: ctx.companyId })
      return { ok: true as const }
    }),
})

const bookingsRouter = router({
  /** Everything still Booked, plus today's Completed and Cancelled ones. */
  upcoming: adminProcedure.query(({ ctx }) =>
    listBookings(ctx.db, { companyId: ctx.companyId, since: localInstant(toLocalDate(ctx.now())) })
  ),

  past: adminProcedure.query(({ ctx }) =>
    listPastBookings(ctx.db, {
      companyId: ctx.companyId,
      before: localInstant(toLocalDate(ctx.now())),
      limit: 100,
    })
  ),

  byId: adminProcedure.input(z.object({ bookingId: z.uuid() })).query(async ({ ctx, input }) => {
    const b = await getBookingById(ctx.db, { ...input, companyId: ctx.companyId })
    if (b === null) throw new TRPCError({ code: "NOT_FOUND" })
    return b
  }),

  /** Time taken by Booked Bookings and Time Off from today, as far ahead as Time Off can be added. */
  occupied: adminProcedure.query(async ({ ctx }) => {
    const today = toLocalDate(ctx.now())
    const occupied = await loadOccupied(
      ctx.db,
      ctx.companyId,
      localInstant(today),
      localInstant(addDays(today, 367))
    )
    return occupied.map(({ startsAt, endsAt }) => ({ startsAt, endsAt }))
  }),

  create: adminProcedure
    .input(zAdminBooking.extend({ callbackRequestId: z.uuid().optional() }))
    .mutation(({ ctx, input }) => {
      const { date, hour, ...rest } = input
      return createAdminBooking(ctx.db, ctx.messaging, {
        ...rest,
        companyId: ctx.companyId,
        startsAt: localInstant(date, hour),
        now: ctx.now(),
      })
    }),

  complete: adminProcedure.input(z.object({ bookingId: z.uuid() })).mutation(async ({ ctx, input }) => {
    await completeBooking(ctx.db, { ...input, companyId: ctx.companyId, now: ctx.now() })
    return { ok: true as const }
  }),

  cancel: adminProcedure.input(z.object({ bookingId: z.uuid() })).mutation(async ({ ctx, input }) => {
    await cancelBookingByAdmin(ctx.db, ctx.messaging, { ...input, companyId: ctx.companyId, now: ctx.now() })
    return { ok: true as const }
  }),

  setPrice: adminProcedure
    .input(z.object({ bookingId: z.uuid(), priceGel: zPrice.nullable() }))
    .mutation(async ({ ctx, input }) => {
      await setBookingPrice(ctx.db, { ...input, companyId: ctx.companyId })
      return { ok: true as const }
    }),
})

const callbackRequestsRouter = router({
  list: adminProcedure.query(({ ctx }) => listPendingCallbackRequests(ctx.db, { companyId: ctx.companyId })),

  pendingCount: adminProcedure.query(({ ctx }) =>
    countPendingCallbackRequests(ctx.db, { companyId: ctx.companyId })
  ),

  byId: adminProcedure.input(z.object({ callbackRequestId: z.uuid() })).query(async ({ ctx, input }) => {
    const r = await getCallbackRequest(ctx.db, { ...input, companyId: ctx.companyId })
    if (r === null) throw new TRPCError({ code: "NOT_FOUND" })
    return r
  }),

  decline: adminProcedure
    .input(z.object({ callbackRequestId: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      await declineCallbackRequest(ctx.db, ctx.messaging, {
        ...input,
        companyId: ctx.companyId,
        now: ctx.now(),
      })
      return { ok: true as const }
    }),
})

const servicesRouter = router({
  list: adminProcedure.query(({ ctx }) =>
    listServices(ctx.db, { companyId: ctx.companyId, includeArchived: true })
  ),

  create: adminProcedure
    .input(zServiceInput)
    .mutation(({ ctx, input }) => createService(ctx.db, { ...input, companyId: ctx.companyId })),

  update: adminProcedure
    .input(zServiceInput.extend({ serviceId: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      await updateService(ctx.db, { ...input, companyId: ctx.companyId })
      return { ok: true as const }
    }),

  setArchived: adminProcedure
    .input(z.object({ serviceId: z.uuid(), archived: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await setServiceArchived(ctx.db, { ...input, companyId: ctx.companyId, now: ctx.now() })
      return { ok: true as const }
    }),
})

const timeOffRouter = router({
  list: adminProcedure.query(({ ctx }) => listTimeOff(ctx.db, { companyId: ctx.companyId, now: ctx.now() })),

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
      await addTimeOff(ctx.db, { ...input, companyId: ctx.companyId })
      return { ok: true as const }
    }),

  remove: adminProcedure.input(z.object({ timeOffId: z.uuid() })).mutation(async ({ ctx, input }) => {
    await removeTimeOff(ctx.db, { ...input, companyId: ctx.companyId })
    return { ok: true as const }
  }),
})

const settingsRouter = router({
  get: adminProcedure.query(({ ctx }) => getSettings(ctx.db, { companyId: ctx.companyId })),

  update: adminProcedure
    .input(
      z.object({
        minNoticeHours: z.number().int().min(0).max(72),
        workingDays: z.array(z.number().int().min(1).max(7)).min(1).max(7),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await updateSettings(ctx.db, {
        companyId: ctx.companyId,
        minNoticeHours: input.minNoticeHours,
        workingDays: input.workingDays as IsoWeekday[],
      })
      return { ok: true as const }
    }),
})

export const adminRouter = router({
  auth: authRouter,
  adminPhones: adminPhonesRouter,
  bookings: bookingsRouter,
  callbackRequests: callbackRequestsRouter,
  services: servicesRouter,
  timeOff: timeOffRouter,
  settings: settingsRouter,
})

export type AdminRouter = typeof adminRouter
export type { AdminContext, SessionCookie } from "./trpc"
export const createAdminCaller = createCallerFactory(adminRouter)
