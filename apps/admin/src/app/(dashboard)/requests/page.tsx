import { formatPhone } from "@sanitation/core/phone"
import { formatDate, formatDateTime, formatHour, toLocalHour } from "@sanitation/core/time"
import { Badge } from "@sanitation/ui"
import { ChevronRightIcon, PauseCircleIcon } from "lucide-react"
import Link from "next/link"

import { PageHeader } from "@/components/page-header"
import { REQUEST_STATUS_LABEL, dayHeading, requestDate, requestTitle } from "@/lib/format"
import { requireAdmin } from "@/server/caller"
import type { AdminCallbackRequest } from "@/trpc/types"

/** `underDay` drops the date from the card when it sits under that day's heading. */
function RequestCard({ request, underDay = false }: { request: AdminCallbackRequest; underDay?: boolean }) {
  const status = REQUEST_STATUS_LABEL[request.status]
  return (
    <Link
      href={`/requests/${request.id}`}
      className="flex items-center gap-3 rounded-2xl bg-paper p-4 ring-1 ring-border transition-colors duration-150 hover:ring-brand-soft focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={status.variant}>{status.label}</Badge>
          {request.desiredStartsAt !== null ? (
            <Badge variant="destructive">
              <PauseCircleIcon aria-hidden />
              დღე შეჩერებულია
            </Badge>
          ) : null}
        </div>
        <span className="line-clamp-2 font-semibold">{requestTitle(request)}</span>
        <span className="text-sm text-ink-soft">
          {request.clientName !== "" ? `${request.clientName} · ` : ""}
          {formatPhone(request.phone)}
        </span>
        {request.desiredStartsAt !== null ? (
          <span className="text-sm">
            სასურველი დრო:{" "}
            {underDay
              ? formatHour(toLocalHour(request.desiredStartsAt))
              : formatDateTime(request.desiredStartsAt)}
          </span>
        ) : null}
        {request.pausedDate !== null && !underDay ? (
          <span className="text-sm">სასურველი დღე: {formatDate(request.pausedDate)}</span>
        ) : null}
      </div>
      <ChevronRightIcon aria-hidden className="size-5 shrink-0 text-ink-soft" />
    </Link>
  )
}

export default async function RequestsPage() {
  const caller = await requireAdmin()
  const pending = await caller.callbackRequests.list()
  const now = new Date()
  const byDay = [...Map.groupBy(pending, requestDate)].toSorted(([a], [b]) =>
    a === null ? 1 : b === null ? -1 : a.localeCompare(b)
  )

  return (
    <>
      <PageHeader
        title="მოთხოვნები"
        description="ინდივიდუალური სამუშაოები და უკუკავშირის თხოვნები. დაურეკეთ კლიენტს და მიიღეთ ან უარყავით."
      />
      <section className="flex flex-col gap-2" aria-labelledby="pending">
        <h2 id="pending" className="text-sm font-semibold text-ink-soft">
          მოლოდინში ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="rounded-2xl bg-paper px-4 py-8 text-center text-ink-soft ring-1 ring-border">
            ახალი მოთხოვნები არ არის.
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            {byDay.map(([date, items]) => (
              <section
                key={date ?? "none"}
                className="flex flex-col gap-2"
                aria-labelledby={`day-${date ?? "none"}`}
              >
                <h3 id={`day-${date ?? "none"}`} className="text-sm font-semibold text-ink-soft">
                  {date === null ? "თარიღის გარეშე" : dayHeading(date, now)}
                </h3>
                {items.map((r) => (
                  <RequestCard key={r.id} request={r} underDay={date !== null} />
                ))}
              </section>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
