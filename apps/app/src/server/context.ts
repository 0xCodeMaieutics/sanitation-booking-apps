import "server-only"
import type { AppContext } from "@sanitation/api/app"
import { createNotifier, createSmsSender } from "@sanitation/core"
import { getDb } from "@sanitation/db"

import { env } from "@/env"

let notify: ReturnType<typeof createNotifier> | undefined

function clientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? ""
  return forwarded !== "" ? forwarded : headers.get("x-real-ip")
}

export function createAppContext(headers: Headers): AppContext {
  notify ??= createNotifier(createSmsSender(env.SMS_PROVIDER ?? ""))
  return {
    db: getDb(),
    messaging: { notify, appUrl: env.APP_URL },
    ipAddress: clientIp(headers),
    now: () => new Date(),
  }
}
