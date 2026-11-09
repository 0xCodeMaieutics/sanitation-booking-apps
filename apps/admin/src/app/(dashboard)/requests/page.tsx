import { formatPhone } from "@sanitation/core/phone"
import { formatDateTime } from "@sanitation/core/time"
import { Badge, cn } from "@sanitation/ui"
import { ChevronRightIcon, PauseCircleIcon } from "lucide-react"
import Link from "next/link"

import { PageHeader } from "@/components/page-header"
import { REQUEST_STATUS_LABEL, requestTitle } from "@/lib/format"
import { requireAdmin } from "@/server/caller"
import type { AdminCallbackRequest } from "@/trpc/types"

function RequestCard({ request }: { request: AdminCallbackRequest }) {
  const status = REQUEST_STATUS_LABEL[request.status]
  const pending = request.status === "pending"
  return (
    <Link
      href={`/requests/${request.id}`}
      className={cn(
        "flex items-center gap-3 rounded-2xl bg-paper p-4 ring-1 ring-border transition-colors duration-150 hover:ring-brand-soft focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        !pending && "opacity-70"
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={status.variant}>{status.label}</Badge>
          {pending && request.desiredStartsAt !== null ? (
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
          <span className="text-sm">სასურველი დრო: {formatDateTime(request.desiredStartsAt)}</span>
        ) : null}
      </div>
      <ChevronRightIcon aria-hidden className="size-5 shrink-0 text-ink-soft" />
    </Link>
  )
}

export default async function RequestsPage() {
  const caller = await requireAdmin()
  const { pending, decided } = await caller.callbackRequests.list()

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
          pending.map((r) => <RequestCard key={r.id} request={r} />)
        )}
      </section>
      {decided.length > 0 ? (
        <section className="mt-8 flex flex-col gap-2" aria-labelledby="decided">
          <h2 id="decided" className="text-sm font-semibold text-ink-soft">
            ბოლოს განხილული
          </h2>
          {decided.map((r) => (
            <RequestCard key={r.id} request={r} />
          ))}
        </section>
      ) : null}
    </>
  )
}
