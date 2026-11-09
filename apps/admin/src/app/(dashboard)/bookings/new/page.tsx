import { toLocalDate } from "@sanitation/core/time"

import { AdminBookingForm } from "@/components/admin-booking-form"
import { PageHeader } from "@/components/page-header"
import { requireAdmin } from "@/server/caller"

export default async function NewBookingPage() {
  const caller = await requireAdmin()
  const services = await caller.services.list()
  const first = services.find((s) => s.archivedAt === null)

  return (
    <>
      <PageHeader title="ახალი ჯავშანი" backHref="/" description="მაგ. ტელეფონით შეთანხმებული ვიზიტი." />
      <AdminBookingForm
        services={services}
        submitLabel="დაჯავშნა"
        defaults={{
          serviceId: first?.id ?? null,
          customService: "",
          date: toLocalDate(new Date()),
          hour: 9,
          durationHours: first?.durationHours ?? null,
          clientName: "",
          phone: "",
          address: "",
          note: "",
        }}
      />
    </>
  )
}
