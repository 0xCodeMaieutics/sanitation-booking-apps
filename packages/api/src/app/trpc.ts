import { DomainError, type Messaging, findCompanyBySlug } from "@sanitation/core"
import type { Db } from "@sanitation/db"
import { initTRPC } from "@trpc/server"
import { z } from "zod"

import { rethrowDomainError, trpcOptions } from "../shared"

export type AppContext = {
  db: Db
  messaging: Messaging
  ipAddress: string | null
  now: () => Date
}

const t = initTRPC.context<AppContext>().create(trpcOptions)

export const router = t.router
export const createCallerFactory = t.createCallerFactory

/** Every Client app procedure is public; Clients have no account. */
export const publicProcedure = t.procedure.use(async ({ next }) => {
  const result = await next()
  if (!result.ok) rethrowDomainError(result.error)
  return result
})

/** A procedure for one Company, named by a current or former slug of its Booking Link. */
export const companyProcedure = publicProcedure
  .input(z.object({ slug: z.string().max(60) }))
  .use(async ({ ctx, input, next }) => {
    const company = await findCompanyBySlug(ctx.db, input.slug)
    if (company === null) throw new DomainError("NOT_FOUND")
    return next({ ctx: { company } })
  })
