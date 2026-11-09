import { toLocalDate } from "@sanitation/core/time"

import { BookingCard } from "@/components/booking-card"
import { PageHeader } from "@/components/page-header"
import { dayHeading } from "@/lib/format"
import { requireAdmin } from "@/server/caller"

export default async function HistoryPage() {
  const caller = await requireAdmin()
  const bookings = await caller.bookings.past()
  const now = new Date()
  const byDay = Map.groupBy(bookings, (b) => toLocalDate(b.startsAt))

  return (
    <>
      <PageHeader title="წარსული ჯავშნები" backHref="/" description="ბოლო 100 შესრულებული ან გაუქმებული" />
      {bookings.length === 0 ? (
        <p className="rounded-2xl bg-paper px-4 py-10 text-center text-ink-soft ring-1 ring-border">
          ჯერ არაფერია.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {[...byDay].map(([date, items]) => (
            <section key={date} className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-ink-soft">{dayHeading(date, now)}</h2>
              {items.map((b) => (
                <BookingCard key={b.id} booking={b} overlaps={false} />
              ))}
            </section>
          ))}
        </div>
      )}
    </>
  )
}
