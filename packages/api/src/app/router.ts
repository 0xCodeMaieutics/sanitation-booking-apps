import {
  DomainError,
  bookingWindowDates,
  cancelBookingByClient,
  createClientBooking,
  createCustomRequest,
  createPausedDayRequest,
  getBookingByToken,
  getService,
  listServices,
  loadCalendar,
  sendClientCode,
  windowAvailability,
} from "@sanitation/core"
import { TRPCError } from "@trpc/server"
import { z } from "zod"

import { zAddress, zCode, zLocalDate, zName, zNote, zPhone } from "../shared"
import { companyProcedure, createCallerFactory, publicProcedure, router } from "./trpc"

const zVerified = { phone: zPhone, verificationId: z.uuid(), code: zCode }

export const appRouter = router({
  // Queries: read by server components through `createAppCaller`.

  /** The Company behind a Booking Link. `slug` differs from the one asked for when that was a former slug. */
  company: companyProcedure.query(({ ctx }) => ({
    slug: ctx.company.slug,
    name: ctx.company.name,
    suspended: ctx.company.suspendedAt !== null,
  })),

  services: companyProcedure.query(async ({ ctx }) => {
    const services = await listServices(ctx.db, { companyId: ctx.company.id, includeArchived: false })
    return services.map(({ id, name, description, durationHours, priceGel }) => ({
      id,
      name,
      description,
      durationHours,
      priceGel,
    }))
  }),

  /** The Booking Window for a Standard Service, or for a Custom Service request when `serviceId` is null. */
  availability: companyProcedure
    .input(z.object({ serviceId: z.uuid().nullable() }))
    .query(async ({ ctx, input }) => {
      const companyId = ctx.company.id
      let durationHours: number | null = null
      if (input.serviceId !== null) {
        const svc = await getService(ctx.db, { companyId, serviceId: input.serviceId })
        if (svc === null || svc.archivedAt !== null) throw new TRPCError({ code: "NOT_FOUND" })
        durationHours = svc.durationHours
      }
      const now = ctx.now()
      const dates = bookingWindowDates(now)
      const calendar = await loadCalendar(ctx.db, {
        companyId,
        from: dates[0] ?? "",
        to: dates.at(-1) ?? "",
        now,
      })
      return windowAvailability(calendar, durationHours)
    }),

  booking: publicProcedure.input(z.object({ token: z.string().max(64) })).query(async ({ ctx, input }) => {
    const b = await getBookingByToken(ctx.db, input.token)
    if (b === null) throw new TRPCError({ code: "NOT_FOUND" })
    return {
      companyName: b.companyName,
      companySlug: b.companySlug,
      title: b.title,
      startsAt: b.startsAt,
      endsAt: b.endsAt,
      status: b.status,
      clientName: b.clientName,
      phone: b.phone,
      address: b.address,
      note: b.note,
      canCancel: b.status === "booked" && b.startsAt > ctx.now(),
    }
  }),

  // Mutations.

  sendCode: companyProcedure.input(z.object({ phone: zPhone })).mutation(async ({ ctx, input }) => {
    if (ctx.company.suspendedAt !== null) throw new DomainError("COMPANY_SUSPENDED")
    const { verificationId } = await sendClientCode(ctx.db, ctx.messaging.notify, {
      phone: input.phone,
      ipAddress: ctx.ipAddress,
      now: ctx.now(),
    })
    return { verificationId }
  }),

  book: companyProcedure
    .input(
      z.object({
        ...zVerified,
        serviceId: z.uuid(),
        startsAt: z.date(),
        clientName: zName,
        address: zAddress,
        note: zNote,
      })
    )
    .mutation(({ ctx, input }) =>
      createClientBooking(ctx.db, ctx.messaging, { ...input, companyId: ctx.company.id, now: ctx.now() })
    ),

  requestCustom: companyProcedure
    .input(
      z.object({
        ...zVerified,
        description: z.string().trim().min(3).max(1000),
        address: zAddress,
        desiredStartsAt: z.date(),
        clientName: zName,
        note: zNote,
      })
    )
    .mutation(({ ctx, input }) =>
      createCustomRequest(ctx.db, ctx.messaging, { ...input, companyId: ctx.company.id, now: ctx.now() })
    ),

  requestCallback: companyProcedure
    .input(
      z.object({
        ...zVerified,
        date: zLocalDate,
        serviceIds: z.array(z.uuid()).max(20),
        description: z.string().trim().max(1000),
        clientName: z.string().trim().max(120),
        note: zNote,
      })
    )
    .mutation(({ ctx, input }) =>
      createPausedDayRequest(ctx.db, ctx.messaging, { ...input, companyId: ctx.company.id, now: ctx.now() })
    ),

  cancel: publicProcedure.input(z.object({ token: z.string().max(64) })).mutation(async ({ ctx, input }) => {
    await cancelBookingByClient(ctx.db, ctx.messaging, { token: input.token, now: ctx.now() })
    return { ok: true as const }
  }),
})

export type AppRouter = typeof appRouter
export type { AppContext } from "./trpc"
export const createAppCaller = createCallerFactory(appRouter)
