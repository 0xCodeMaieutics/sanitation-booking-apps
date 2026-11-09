import { notFound } from "next/navigation"

import { Shell } from "@/components/shell"
import { findBooking } from "@/server/caller"

export default async function ManageBookingLayout({ children, params }: LayoutProps<"/b/[token]">) {
  const booking = await findBooking((await params).token)
  if (booking === null) notFound()
  return (
    <Shell name={booking.companyName} href={`/${booking.companySlug}`}>
      {children}
    </Shell>
  )
}
