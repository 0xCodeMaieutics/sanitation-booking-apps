import { formatPhone } from "@sanitation/core/phone"
import { formatDate, formatHour, toLocalDate, toLocalHour } from "@sanitation/core/time"
import { Badge } from "@sanitation/ui"
import { CalendarIcon, CheckCircle2Icon, MapPinIcon, PhoneIcon, UserIcon } from "lucide-react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import type { ReactNode } from "react"

import { findBooking } from "@/server/caller"

import { CancelBooking } from "./cancel-booking"

export const metadata: Metadata = { robots: { index: false, follow: false } }

const STATUS = {
  booked: { label: "დაჯავშნილია", variant: "default" },
  completed: { label: "შესრულებულია", variant: "success" },
  cancelled: { label: "გაუქმებულია", variant: "muted" },
} as const

export default async function ManageBookingPage({ params, searchParams }: PageProps<"/b/[token]">) {
  const { token } = await params
  const { new: isNew } = await searchParams
  const booking = await findBooking(token)
  if (booking === null) notFound()
  const status = STATUS[booking.status]

  return (
    <div className="flex flex-col gap-5">
      {isNew === "1" && booking.status === "booked" ? (
        <div aria-live="polite" className="flex items-start gap-3 rounded-2xl bg-success-soft p-4 text-ink">
          <CheckCircle2Icon aria-hidden className="mt-0.5 size-5 shrink-0 text-success" />
          <div className="flex flex-col gap-0.5">
            <p className="font-semibold">ჯავშანი დადასტურდა</p>
            <p className="text-sm">SMS-ით გამოგიგზავნეთ ამ გვერდის ბმული.</p>
          </div>
        </div>
      ) : null}

      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl">თქვენი ჯავშანი</h1>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>

      <dl className="flex flex-col divide-y divide-border rounded-2xl bg-paper ring-1 ring-border">
        <Row label="სერვისი" value={booking.title} strong />
        <Row
          label="დრო"
          icon={<CalendarIcon aria-hidden className="size-4" />}
          value={`${formatDate(toLocalDate(booking.startsAt))}, ${formatHour(toLocalHour(booking.startsAt))}`}
        />
        <Row label="მისამართი" icon={<MapPinIcon aria-hidden className="size-4" />} value={booking.address} />
        <Row label="სახელი" icon={<UserIcon aria-hidden className="size-4" />} value={booking.clientName} />
        <Row
          label="ტელეფონი"
          icon={<PhoneIcon aria-hidden className="size-4" />}
          value={formatPhone(booking.phone)}
        />
        {booking.note ? <Row label="შენიშვნა" value={booking.note} /> : null}
      </dl>

      {booking.canCancel ? <CancelBooking token={token} /> : null}
    </div>
  )
}

function Row({
  label,
  value,
  icon,
  strong,
}: {
  label: string
  value: string
  icon?: ReactNode
  strong?: boolean
}) {
  return (
    <div className="flex flex-col gap-0.5 px-4 py-3">
      <dt className="flex items-center gap-1.5 text-xs text-ink-soft">
        {icon}
        {label}
      </dt>
      <dd className={strong === true ? "font-semibold" : undefined}>{value}</dd>
    </div>
  )
}
