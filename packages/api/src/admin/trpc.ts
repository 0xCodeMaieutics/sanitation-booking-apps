import { DomainError, type Messaging, findAdminSession } from "@sanitation/core"
import type { Db } from "@sanitation/db"
import { initTRPC } from "@trpc/server"

import { rethrowDomainError, trpcOptions } from "../shared"

/** Reads and writes the Admin session cookie; implemented by the Next.js app. */
export type SessionCookie = {
  get(): string | null
  set(token: string, expiresAt: Date): void
  clear(): void
}

export type AdminContext = {
  db: Db
  messaging: Messaging
  session: SessionCookie
  ipAddress: string | null
  userAgent: string
  now: () => Date
}

const t = initTRPC.context<AdminContext>().create(trpcOptions)

export const router = t.router
export const createCallerFactory = t.createCallerFactory

export const publicProcedure = t.procedure.use(async ({ next }) => {
  const result = await next()
  if (!result.ok) rethrowDomainError(result.error)
  return result
})

/** Requires a signed-in Admin session on this device; everything it does is scoped to that Admin's Company. */
export const adminProcedure = publicProcedure.use(async ({ ctx, next }) => {
  const token = ctx.session.get()
  const admin = token === null ? null : await findAdminSession(ctx.db, { token, now: ctx.now() })
  if (admin === null) throw new DomainError("UNAUTHORIZED")
  return next({ ctx: { admin, companyId: admin.companyId } })
})
