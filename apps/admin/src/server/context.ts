import "server-only"
import type { AdminContext, SessionCookie } from "@sanitation/api/admin"
import { createNotifier, createSmsSender } from "@sanitation/core"
import { getDb } from "@sanitation/db"
import { cookies } from "next/headers"

import { env } from "@/env"

export const SESSION_COOKIE = "admin_session"

let notify: ReturnType<typeof createNotifier> | undefined

/** The session cookie; it can only be written from the tRPC route handler, not while rendering. */
async function sessionCookie(): Promise<SessionCookie> {
  const store = await cookies()
  return {
    get: () => store.get(SESSION_COOKIE)?.value ?? null,
    set: (token, expiresAt) =>
      store.set(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        expires: expiresAt,
      }),
    clear: () => store.delete(SESSION_COOKIE),
  }
}

function clientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? ""
  return forwarded !== "" ? forwarded : headers.get("x-real-ip")
}

export async function createAdminContext(headers: Headers): Promise<AdminContext> {
  notify ??= createNotifier(createSmsSender(env.SMS_PROVIDER ?? ""), env.ADMIN_PHONE)
  return {
    db: getDb(),
    messaging: { notify, appUrl: env.APP_URL },
    adminPhone: env.ADMIN_PHONE,
    session: await sessionCookie(),
    ipAddress: clientIp(headers),
    userAgent: headers.get("user-agent")?.slice(0, 300) ?? "",
    now: () => new Date(),
  }
}
