import { formatHour, toLocalHour } from "@sanitation/core/time"
import { Badge, cn } from "@sanitation/ui"
import { ChevronRightIcon, MapPinIcon } from "lucide-react"
import Link from "next/link"

import { STATUS_LABEL, formatPrice } from "@/lib/format"
import type { AdminBooking } from "@/trpc/types"

export function BookingCard({ booking, overlaps }: { booking: AdminBooking; overlaps: boolean }) {
  const status = STATUS_LABEL[booking.status]
  const from = toLocalHour(booking.startsAt)
  return (
    <Link
      href={`/bookings/${booking.id}`}
      className={cn(
        "flex items-center gap-3 rounded-2xl bg-paper p-4 ring-1 transition-colors duration-150 hover:ring-brand-soft focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        overlaps ? "ring-2 ring-danger" : "ring-border",
        booking.status !== "booked" && "opacity-70"
      )}
    >
      <div className="flex w-14 shrink-0 flex-col items-center tabular-nums">
        <span className="text-lg font-semibold">{formatHour(from)}</span>
        <span className="text-xs text-ink-soft">{formatHour((from + booking.durationHours) % 24)}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{booking.title}</span>
          {booking.status !== "booked" ? <Badge variant={status.variant}>{status.label}</Badge> : null}
          {booking.serviceId === null ? <Badge variant="warning">ინდივიდუალური</Badge> : null}
          {overlaps ? <Badge variant="destructive">გადაფარვა</Badge> : null}
        </div>
        <span className="text-sm">{booking.clientName}</span>
        <span className="flex items-center gap-1 truncate text-sm text-ink-soft">
          <MapPinIcon aria-hidden className="size-3.5 shrink-0" />
          <span className="truncate">{booking.address}</span>
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1 text-sm font-semibold">
        {formatPrice(booking.priceGel)}
        <ChevronRightIcon aria-hidden className="size-5 text-ink-soft" />
      </div>
    </Link>
  )
}
