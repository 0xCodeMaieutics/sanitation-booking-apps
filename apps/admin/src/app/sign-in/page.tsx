import { formatPhone, normalizePhone } from "@sanitation/core/phone"
import { Logo } from "@sanitation/ui"

import { env } from "@/env"
import { serverCaller } from "@/server/caller"

import { SignInForm } from "./sign-in-form"

export default async function SignInPage() {
  const phoneHint = await (await serverCaller()).auth.phoneHint()
  const defaultPhone =
    process.env.NODE_ENV === "development" ? formatPhone(normalizePhone(env.ADMIN_PHONE)) : ""
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-4 py-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <Logo className="size-12" />
        <h1 className="text-2xl">ადმინისტრირება</h1>
        <p className="text-ink-soft">შესასვლელად მიიღებთ SMS კოდს ნომერზე {phoneHint}</p>
      </div>
      <SignInForm defaultPhone={defaultPhone} />
    </main>
  )
}
