import "server-only"
import { createAdminCaller } from "@sanitation/api/admin"
import { TRPCError } from "@trpc/server"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { cache } from "react"

import { createAdminContext } from "./context"

/** Calls the admin tRPC procedures directly from server components, once per request. */
export const serverCaller = cache(async () => createAdminCaller(await createAdminContext(await headers())))

/** Sends a device without a valid Admin session to the sign-in screen. */
export const requireAdmin = cache(async () => {
  const caller = await serverCaller()
  try {
    await caller.auth.check()
  } catch (error) {
    if (error instanceof TRPCError && error.code === "UNAUTHORIZED") redirect("/sign-in")
    throw error
  }
  return caller
})

/** Awaits a lookup, resolving to `null` when the record is missing. */
export async function findOrNull<T>(lookup: Promise<T>): Promise<T | null> {
  try {
    return await lookup
  } catch (error) {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") return null
    throw error
  }
}
