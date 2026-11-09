import { formatPhone } from "@sanitation/core/phone"
import { formatDate, formatHour, toLocalDate, toLocalHour } from "@sanitation/core/time"
import { Badge } from "@sanitation/ui"
import { MapPinIcon, PhoneIcon } from "lucide-react"
import { notFound } from "next/navigation"

import { PageHeader } from "@/components/page-header"
import { STATUS_LABEL, formatDuration } from "@/lib/format"
import { findOrNull, requireAdmin } from "@/server/caller"

import { BookingActions } from "./booking-actions"
import { PriceEditor } from "./price-editor"

export default async function BookingPage({ params }: PageProps<"/bookings/[id]">) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound()
  const caller = await requireAdmin()
  const booking = await findOrNull(caller.bookings.byId({ bookingId: id }))
  if (booking === null) notFound()
  const status = STATUS_LABEL[booking.status]
  const from = toLocalHour(booking.startsAt)

  return (
    <>
      <PageHeader title={booking.title} backHref="/" />
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={status.variant}>{status.label}</Badge>
          {booking.serviceId === null ? <Badge variant="warning">ინდივიდუალური</Badge> : null}
          {booking.createdBy === "admin" ? <Badge variant="muted">ადმინის ჯავშანი</Badge> : null}
          {booking.cancelledBy === "client" ? <Badge variant="muted">გააუქმა კლიენტმა</Badge> : null}
        </div>

        <dl className="flex flex-col divide-y divide-border rounded-2xl bg-paper ring-1 ring-border">
          <div className="flex flex-col gap-0.5 px-4 py-3">
            <dt className="text-xs text-ink-soft">დრო</dt>
            <dd className="font-semibold">
              {formatDate(toLocalDate(booking.startsAt))}, {formatHour(from)}–
              {formatHour((from + booking.durationHours) % 24)}{" "}
              <span className="font-normal text-ink-soft">({formatDuration(booking.durationHours)})</span>
            </dd>
          </div>
          <div className="flex flex-col gap-0.5 px-4 py-3">
            <dt className="text-xs text-ink-soft">კლიენტი</dt>
            <dd>{booking.clientName}</dd>
            <dd>
              <a
                href={`tel:${booking.phone}`}
                className="inline-flex min-h-11 items-center gap-2 font-semibold text-brand underline-offset-4 hover:underline"
              >
                <PhoneIcon aria-hidden className="size-4" />
                {formatPhone(booking.phone)}
              </a>
            </dd>
          </div>
          <div className="flex flex-col gap-0.5 px-4 py-3">
            <dt className="text-xs text-ink-soft">მისამართი</dt>
            <dd>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.address)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center gap-2 text-brand underline-offset-4 hover:underline"
              >
                <MapPinIcon aria-hidden className="size-4 shrink-0" />
                {booking.address}
              </a>
            </dd>
          </div>
          {booking.note ? (
            <div className="flex flex-col gap-0.5 px-4 py-3">
              <dt className="text-xs text-ink-soft">შენიშვნა</dt>
              <dd className="whitespace-pre-wrap">{booking.note}</dd>
            </div>
          ) : null}
        </dl>

        <PriceEditor bookingId={booking.id} priceGel={booking.priceGel} />

        {booking.status === "booked" ? <BookingActions bookingId={booking.id} /> : null}
      </div>
    </>
  )
}
