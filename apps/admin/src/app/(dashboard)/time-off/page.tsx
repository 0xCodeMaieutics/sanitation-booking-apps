import { formatDate, formatHour, toLocalDate, toLocalHour } from "@sanitation/core/time"

import { PageHeader } from "@/components/page-header"
import { requireAdmin } from "@/server/caller"

import { AddTimeOff } from "./add-time-off"
import { RemoveTimeOff } from "./remove-time-off"

function describe(startsAt: Date, endsAt: Date): string {
  const from = toLocalHour(startsAt)
  const to = toLocalHour(endsAt)
  const startDate = toLocalDate(startsAt)
  if (from === 0 && to === 0) return `${formatDate(startDate)} · მთელი დღე`
  return `${formatDate(startDate)} · ${formatHour(from)}–${formatHour(to)}`
}

export default async function TimeOffPage() {
  const caller = await requireAdmin()
  const entries = await caller.timeOff.list()

  return (
    <>
      <PageHeader title="არასამუშაო დრო" description="ამ დროს კლიენტები ვერ დაჯავშნიან." />
      <AddTimeOff today={toLocalDate(new Date())} />
      <section className="mt-6 flex flex-col gap-2" aria-labelledby="scheduled">
        <h2 id="scheduled" className="text-sm font-semibold text-ink-soft">
          დაგეგმილი
        </h2>
        {entries.length === 0 ? (
          <p className="rounded-2xl bg-paper px-4 py-8 text-center text-ink-soft ring-1 ring-border">
            არასამუშაო დრო არ არის დამატებული.
          </p>
        ) : (
          entries.map((t) => (
            <div key={t.id} className="flex items-center gap-3 rounded-2xl bg-paper p-4 ring-1 ring-border">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-semibold">{describe(t.startsAt, t.endsAt)}</span>
                {t.note !== "" ? <span className="text-sm text-ink-soft">{t.note}</span> : null}
              </div>
              <RemoveTimeOff timeOffId={t.id} />
            </div>
          ))
        )}
      </section>
    </>
  )
}
