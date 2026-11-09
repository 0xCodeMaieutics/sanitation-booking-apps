import { PageHeader } from "@/components/page-header"
import { requireAdmin } from "@/server/caller"

import { SettingsForm } from "./settings-form"
import { SignOut } from "./sign-out"

export default async function SettingsPage() {
  const caller = await requireAdmin()
  const settings = await caller.settings.get()

  return (
    <>
      <PageHeader title="პარამეტრები" description="სამუშაო საათები: 09:00–18:00 (დაწყების დრო)." />
      <SettingsForm minNoticeHours={settings.minNoticeHours} workingDays={settings.workingDays} />
      <SignOut />
    </>
  )
}
