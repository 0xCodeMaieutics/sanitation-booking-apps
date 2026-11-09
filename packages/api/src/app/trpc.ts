import type { Messaging } from "@sanitation/core"
import type { Db } from "@sanitation/db"
import { initTRPC } from "@trpc/server"

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
