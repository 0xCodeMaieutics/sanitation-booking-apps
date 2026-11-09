import { Logo } from "@sanitation/ui"

import { SignInForm } from "./sign-in-form"

/** An Admin Phone of the first Company in the local seed. */
const DEV_ADMIN_PHONE = "+995 555 12 34 56"

export default function SignInPage() {
  const defaultPhone = process.env.NODE_ENV === "development" ? DEV_ADMIN_PHONE : ""
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-4 py-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <Logo className="size-12" />
        <h1 className="text-2xl">ადმინისტრირება</h1>
        <p className="text-ink-soft">შეიყვანეთ ადმინისტრატორის ნომერი — მასზე მიიღებთ SMS კოდს.</p>
      </div>
      <SignInForm defaultPhone={defaultPhone} />
    </main>
  )
}
