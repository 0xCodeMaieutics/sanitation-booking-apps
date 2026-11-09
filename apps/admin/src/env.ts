import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

const isProduction = process.env.VERCEL_ENV === "production"

export const env = createEnv({
  server: {
    DATABASE_URL: z.url(),
    SMS_PROVIDER: isProduction ? z.literal("sender.ge") : z.enum(["sender.ge"]).optional(),
    SENDER_GE_API_KEY: isProduction ? z.string() : z.string().optional(),
    ADMIN_PHONE: z.string().min(9),
    APP_URL: z.url(),
  },
  client: {},
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    SMS_PROVIDER: process.env.SMS_PROVIDER,
    SENDER_GE_API_KEY: process.env.SENDER_GE_API_KEY,
    ADMIN_PHONE: process.env.ADMIN_PHONE,
    APP_URL: process.env.APP_URL,
  },
  emptyStringAsUndefined: true,
  skipValidation: Boolean(process.env.SKIP_ENV_VALIDATION),
})
