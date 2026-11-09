import { formatPhone } from "@sanitation/core/phone"
import { formatDate, formatDateTime, toLocalDate, toLocalHour } from "@sanitation/core/time"
import { Badge } from "@sanitation/ui"
import { PauseCircleIcon, PhoneIcon } from "lucide-react"
import { notFound } from "next/navigation"
import type { ReactNode } from "react"

import { AdminBookingForm } from "@/components/admin-booking-form"
import { PageHeader } from "@/components/page-header"
import { REQUEST_STATUS_LABEL, requestDate, requestTitle } from "@/lib/format"
import { findOrNull, requireAdmin } from "@/server/caller"

import { DeclineRequest } from "./decline-request"

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 px-4 py-3">
      <dt className="text-xs text-ink-soft">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

export default async function RequestPage({ params }: PageProps<"/requests/[id]">) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound()
  const caller = await requireAdmin()
  const request = await findOrNull(caller.callbackRequests.byId({ callbackRequestId: id }))
  if (request === null) notFound()
  const [services, occupied] = await Promise.all([caller.services.list(), caller.bookings.occupied()])
  const status = REQUEST_STATUS_LABEL[request.status]
  const pending = request.status === "pending"
  const defaultDate = requestDate(request) ?? toLocalDate(new Date())
  const onlyService =
    request.services.length === 1 && request.description === "" ? request.services[0] : undefined
  const knownService = services.find((s) => s.id === onlyService?.id && s.archivedAt === null)

  return (
    <>
      <PageHeader title={requestTitle(request)} backHref="/requests" />
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={status.variant}>{status.label}</Badge>
          {pending && request.desiredStartsAt !== null ? (
            <Badge variant="destructive">
              <PauseCircleIcon aria-hidden />
              დღე შეჩერებულია, სანამ არ განიხილავთ
            </Badge>
          ) : null}
        </div>

        <dl className="flex flex-col divide-y divide-border rounded-2xl bg-paper ring-1 ring-border">
          {request.services.length > 0 ? (
            <Row label="სერვისები">{request.services.map((s) => s.name).join(", ")}</Row>
          ) : null}
          {request.description !== "" ? (
            <Row label="აღწერა">
              <span className="whitespace-pre-wrap">{request.description}</span>
            </Row>
          ) : null}
          {request.desiredStartsAt !== null ? (
            <Row label="სასურველი დრო">{formatDateTime(request.desiredStartsAt)}</Row>
          ) : null}
          {request.pausedDate !== null ? (
            <Row label="სასურველი დღე">{formatDate(request.pausedDate)}</Row>
          ) : null}
          <Row label="კლიენტი">
            {request.clientName !== "" ? <span className="block">{request.clientName}</span> : null}
            <a
              href={`tel:${request.phone}`}
              className="inline-flex min-h-11 items-center gap-2 font-semibold text-brand underline-offset-4 hover:underline"
            >
              <PhoneIcon aria-hidden className="size-4" />
              {formatPhone(request.phone)}
            </a>
          </Row>
          {request.address !== "" ? <Row label="მისამართი">{request.address}</Row> : null}
          {request.note !== "" ? (
            <Row label="შენიშვნა">
              <span className="whitespace-pre-wrap">{request.note}</span>
            </Row>
          ) : null}
          <Row label="მიღებულია">{formatDateTime(request.createdAt)}</Row>
        </dl>

        {pending ? (
          <>
            <section
              className="flex flex-col gap-3 rounded-2xl bg-paper p-4 ring-1 ring-border"
              aria-labelledby="accept"
            >
              <div className="flex flex-col gap-1">
                <h2 id="accept" className="text-lg">
                  ჯავშნად გადაქცევა
                </h2>
                <p className="text-sm text-ink-soft">
                  კლიენტთან შეთანხმების შემდეგ მიუთითეთ დრო, სავარაუდო ხანგრძლივობა და ფასი.
                </p>
              </div>
              <AdminBookingForm
                services={services}
                occupied={occupied}
                callbackRequestId={request.id}
                submitLabel="მიღება და დაჯავშნა"
                defaults={{
                  serviceId: knownService?.id ?? null,
                  customService: requestTitle(request),
                  date: defaultDate,
                  hour: request.desiredStartsAt === null ? null : toLocalHour(request.desiredStartsAt),
                  durationHours: knownService?.durationHours ?? null,
                  clientName: request.clientName,
                  phone: request.phone,
                  address: request.address,
                  note: request.note,
                }}
              />
            </section>
            <DeclineRequest callbackRequestId={request.id} />
          </>
        ) : null}
      </div>
    </>
  )
}
