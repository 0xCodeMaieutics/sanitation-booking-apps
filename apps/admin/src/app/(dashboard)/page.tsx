import { toLocalDate } from "@sanitation/core/time"
import { Button } from "@sanitation/ui"
import { CalendarPlusIcon, HistoryIcon } from "lucide-react"
import Link from "next/link"

import { BookingCard } from "@/components/booking-card"
import { PageHeader } from "@/components/page-header"
import { dayHeading } from "@/lib/format"
import { requireAdmin } from "@/server/caller"
import type { AdminBooking } from "@/trpc/types"

/** Booked Bookings whose time overlaps another Booked one. */
function overlappingIds(bookings: AdminBooking[]): Set<string> {
  const booked = bookings.filter((b) => b.status === "booked")
  const ids = new Set<string>()
  for (const a of booked) {
    for (const b of booked) {
      if (a.id !== b.id && a.startsAt < b.endsAt && b.startsAt < a.endsAt) ids.add(a.id)
    }
  }
  return ids
}

export default async function BookingsPage() {
  const caller = await requireAdmin()
  const bookings = await caller.bookings.upcoming()
  const now = new Date()
  const overlaps = overlappingIds(bookings)
  const byDay = Map.groupBy(bookings, (b) => toLocalDate(b.startsAt))

  return (
    <>
      <PageHeader
        title="ჯავშნები"
        action={
          <Button asChild>
            <Link href="/bookings/new">
              <CalendarPlusIcon aria-hidden />
              ახალი
            </Link>
          </Button>
        }
      />

      {bookings.length === 0 ? (
        <p className="rounded-2xl bg-paper px-4 py-10 text-center text-ink-soft ring-1 ring-border">
          მომავალი ჯავშნები არ არის.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {[...byDay].map(([date, items]) => (
            <section key={date} className="flex flex-col gap-2" aria-labelledby={`day-${date}`}>
              <h2 id={`day-${date}`} className="text-sm font-semibold text-ink-soft">
                {dayHeading(date, now)}
              </h2>
              {items.map((b) => (
                <BookingCard key={b.id} booking={b} overlaps={overlaps.has(b.id)} />
              ))}
            </section>
          ))}
        </div>
      )}

      <Button asChild variant="ghost" className="mt-6">
        <Link href="/bookings/history">
          <HistoryIcon aria-hidden />
          წარსული ჯავშნები
        </Link>
      </Button>
    </>
  )
}
