import "server-only"
import { createAppCaller } from "@sanitation/api/app"
import { TRPCError } from "@trpc/server"
import { headers } from "next/headers"
import { cache } from "react"

import { createAppContext } from "./context"

/** Calls the Client app's tRPC procedures directly from server components, once per request. */
export const serverCaller = cache(async () => createAppCaller(createAppContext(await headers())))

/** Awaits a lookup, resolving to `null` when the record is missing. */
export async function findOrNull<T>(lookup: Promise<T>): Promise<T | null> {
  try {
    return await lookup
  } catch (error) {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") return null
    throw error
  }
}

/** The Company behind a slug, shared by a request's layout, metadata and pages. */
export const findCompany = cache(async (slug: string) => findOrNull((await serverCaller()).company({ slug })))

/** The Booking behind a Manage Link, shared by its layout and page. */
export const findBooking = cache(async (token: string) =>
  findOrNull((await serverCaller()).booking({ token }))
)
