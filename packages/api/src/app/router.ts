import {
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

import { zAddress, zCode, zName, zNote, zPhone } from "../shared"
import { createCallerFactory, publicProcedure, router } from "./trpc"

const zVerified = { phone: zPhone, verificationId: z.uuid(), code: zCode }

export const appRouter = router({
  // Queries: read by server components through `createAppCaller`.

  services: publicProcedure.query(async ({ ctx }) => {
    const services = await listServices(ctx.db, { includeArchived: false })
    return services.map(({ id, name, description, durationHours, priceGel }) => ({
      id,
      name,
      description,
      durationHours,
      priceGel,
    }))
  }),

  /** The Booking Window for a Standard Service, or for a Custom Service request when `serviceId` is null. */
  availability: publicProcedure
    .input(z.object({ serviceId: z.uuid().nullable() }))
    .query(async ({ ctx, input }) => {
      let durationHours: number | null = null
      if (input.serviceId !== null) {
        const svc = await getService(ctx.db, input.serviceId)
        if (svc === null || svc.archivedAt !== null) throw new TRPCError({ code: "NOT_FOUND" })
        durationHours = svc.durationHours
      }
      const now = ctx.now()
      const dates = bookingWindowDates(now)
      const calendar = await loadCalendar(ctx.db, { from: dates[0] ?? "", to: dates.at(-1) ?? "", now })
      return windowAvailability(calendar, durationHours)
    }),

  booking: publicProcedure.input(z.object({ token: z.string().max(64) })).query(async ({ ctx, input }) => {
    const b = await getBookingByToken(ctx.db, input.token)
    if (b === null) throw new TRPCError({ code: "NOT_FOUND" })
    return {
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

  sendCode: publicProcedure.input(z.object({ phone: zPhone })).mutation(async ({ ctx, input }) => {
    const { verificationId } = await sendClientCode(ctx.db, ctx.messaging.notify, {
      phone: input.phone,
      ipAddress: ctx.ipAddress,
      now: ctx.now(),
    })
    return { verificationId }
  }),

  book: publicProcedure
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
    .mutation(({ ctx, input }) => createClientBooking(ctx.db, ctx.messaging, { ...input, now: ctx.now() })),

  requestCustom: publicProcedure
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
    .mutation(({ ctx, input }) => createCustomRequest(ctx.db, ctx.messaging, { ...input, now: ctx.now() })),

  requestCallback: publicProcedure
    .input(
      z.object({
        ...zVerified,
        serviceIds: z.array(z.uuid()).max(20),
        description: z.string().trim().max(1000),
        clientName: z.string().trim().max(120),
        note: zNote,
      })
    )
    .mutation(({ ctx, input }) =>
      createPausedDayRequest(ctx.db, ctx.messaging, { ...input, now: ctx.now() })
    ),

  cancel: publicProcedure.input(z.object({ token: z.string().max(64) })).mutation(async ({ ctx, input }) => {
    await cancelBookingByClient(ctx.db, ctx.messaging, { token: input.token, now: ctx.now() })
    return { ok: true as const }
  }),
})

export type AppRouter = typeof appRouter
export type { AppContext } from "./trpc"
export const createAppCaller = createCallerFactory(appRouter)
