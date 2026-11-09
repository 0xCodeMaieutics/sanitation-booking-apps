import { PageHeader } from "@/components/page-header"
import { requireAdmin } from "@/server/caller"

import { AdminPhones } from "./admin-phones"
import { BookingLink } from "./booking-link"
import { SettingsForm } from "./settings-form"
import { SignOut } from "./sign-out"

export default async function SettingsPage() {
  const caller = await requireAdmin()
  const [settings, me, phones] = await Promise.all([
    caller.settings.get(),
    caller.auth.me(),
    caller.adminPhones.list(),
  ])

  return (
    <>
      <PageHeader title="პარამეტრები" />
      <div className="flex flex-col gap-5">
        <BookingLink url={me.bookingLink} />
        <SettingsForm {...settings} />
        <AdminPhones phones={phones} currentId={me.adminPhoneId} />
      </div>
      <SignOut />
    </>
  )
}
