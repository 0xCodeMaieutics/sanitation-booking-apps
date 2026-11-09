"use client"

import { type LocalDate, formatDate, formatHour, toLocalDate, toLocalHour } from "@sanitation/core/time"
import { Button } from "@sanitation/ui"
import { useMutation } from "@tanstack/react-query"
import { CalendarIcon, ClockIcon, MapPinIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { type FormEvent, useState } from "react"

import { BottomBar } from "@/components/bottom-bar"
import { CallbackForm } from "@/components/callback-form"
import { CodeStep, useSendCode } from "@/components/code-step"
import { type Contact, ContactFields, emptyContact, validateContact } from "@/components/contact-fields"
import { DayStrip } from "@/components/day-strip"
import { StepHeader } from "@/components/step-header"
import { TimeGrid } from "@/components/time-grid"
import { firstUsefulDate } from "@/lib/days"
import { domainCodeOf, errorMessage } from "@/lib/errors"
import { formatDuration, formatPrice } from "@/lib/format"
import { useTRPC } from "@/trpc/client"
import type { Availability, ServiceSummary } from "@/trpc/types"

type Step = "time" | "details" | "code"

export function BookingFlow({
  service,
  services,
  days,
}: {
  service: ServiceSummary
  services: ServiceSummary[]
  days: Availability
}) {
  const trpc = useTRPC()
  const router = useRouter()
  const [step, setStep] = useState<Step>("time")
  const [date, setDate] = useState<LocalDate>(() => firstUsefulDate(days))
  const [time, setTime] = useState<Date | null>(null)
  const [contact, setContact] = useState<Contact>(emptyContact)
  const [errors, setErrors] = useState<ReturnType<typeof validateContact>>({})
  const [verificationId, setVerificationId] = useState<string | null>(null)
  const [timeError, setTimeError] = useState<string | null>(null)
  const sendCode = useSendCode()
  const book = useMutation(
    trpc.book.mutationOptions({
      onSuccess: ({ manageToken }) => router.push(`/b/${manageToken}?new=1`),
      onError: (error) => {
        const code = domainCodeOf(error)
        if (code === "START_UNAVAILABLE" || code === "DAY_PAUSED") {
          setTimeError(errorMessage(error))
          setTime(null)
          setVerificationId(null)
          setStep("time")
          router.refresh()
        }
      },
    })
  )

  const day = days.find((d) => d.date === date)

  if (step === "code" && verificationId !== null && time !== null) {
    return (
      <div className="flex flex-col gap-5">
        <StepHeader title="დადასტურება" step={3} of={3} onBack={() => setStep("details")} />
        <CodeStep
          phone={contact.phone}
          onResent={setVerificationId}
          isSubmitting={book.isPending}
          submitError={book.error}
          submitLabel="დაჯავშნა"
          onSubmit={(code) =>
            book.mutate({ ...contact, verificationId, code, serviceId: service.id, startsAt: time })
          }
        />
      </div>
    )
  }

  if (step === "details" && time !== null) {
    const submit = (e: FormEvent) => {
      e.preventDefault()
      const found = validateContact(contact, { name: true, address: true })
      setErrors(found)
      if (Object.keys(found).length > 0) return
      sendCode.mutate(
        { phone: contact.phone },
        {
          onSuccess: (r) => {
            setVerificationId(r.verificationId)
            setStep("code")
          },
        }
      )
    }
    return (
      <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
        <StepHeader title="თქვენი მონაცემები" step={2} of={3} onBack={() => setStep("time")} />
        <Summary service={service} time={time} onChange={() => setStep("time")} />
        <ContactFields
          value={contact}
          onChange={setContact}
          errors={errors}
          show={{ name: "required", address: true, noteLabel: "დამატებითი ინფორმაცია" }}
        />
        {sendCode.error !== null ? (
          <p role="alert" className="text-sm text-danger">
            {errorMessage(sendCode.error)}
          </p>
        ) : null}
        <BottomBar>
          <Button type="submit" variant="cta" size="lg" className="w-full" disabled={sendCode.isPending}>
            {sendCode.isPending ? "იგზავნება…" : "SMS კოდის მიღება"}
          </Button>
        </BottomBar>
      </form>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <StepHeader title={service.name} step={1} of={3} backHref="/" />
      <p className="-mt-3 flex items-center gap-3 text-sm text-ink-soft">
        <span className="flex items-center gap-1">
          <ClockIcon aria-hidden className="size-3.5" />
          {formatDuration(service.durationHours)}
        </span>
        <span className="font-semibold text-ink">{formatPrice(service.priceGel)}</span>
      </p>

      <section className="flex flex-col gap-3" aria-labelledby="day-heading">
        <h2 id="day-heading" className="text-base">
          აირჩიეთ დღე
        </h2>
        <DayStrip
          days={days}
          selected={date}
          onSelect={(d) => {
            setDate(d)
            setTime(null)
            setTimeError(null)
          }}
        />
      </section>

      {day?.status === "paused" ? (
        <CallbackForm key={date} services={services} preselectedServiceId={service.id} />
      ) : (
        <section className="flex flex-col gap-3" aria-labelledby="time-heading">
          <h2 id="time-heading" className="text-base">
            {date ? formatDate(date) : "დრო"}
          </h2>
          {timeError !== null ? (
            <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-danger">
              {timeError}
            </p>
          ) : null}
          <TimeGrid
            times={day?.startTimes ?? []}
            selected={time}
            onSelect={setTime}
            emptyText="ამ დღეს თავისუფალი დრო აღარ არის. აირჩიეთ სხვა დღე."
          />
          <BottomBar>
            <div className="flex min-w-0 flex-1 flex-col text-sm">
              {time !== null ? (
                <>
                  <span className="text-ink-soft">{formatDate(date)}</span>
                  <span className="font-semibold">{formatHour(toLocalHour(time))}</span>
                </>
              ) : (
                <span className="text-ink-soft">აირჩიეთ დრო</span>
              )}
            </div>
            <Button
              type="button"
              variant="cta"
              size="lg"
              disabled={time === null}
              onClick={() => setStep("details")}
            >
              გაგრძელება
            </Button>
          </BottomBar>
        </section>
      )}
    </div>
  )
}

function Summary({ service, time, onChange }: { service: ServiceSummary; time: Date; onChange: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl bg-paper p-4 ring-1 ring-border">
      <dl className="flex flex-col gap-1.5 text-sm">
        <dt className="sr-only">სერვისი</dt>
        <dd className="font-semibold">
          {service.name} · {formatPrice(service.priceGel)}
        </dd>
        <dt className="sr-only">თარიღი</dt>
        <dd className="flex items-center gap-1.5 text-ink-soft">
          <CalendarIcon aria-hidden className="size-4" />
          {formatDate(toLocalDate(time))}, {formatHour(toLocalHour(time))}
        </dd>
        <dd className="flex items-center gap-1.5 text-ink-soft">
          <MapPinIcon aria-hidden className="size-4" />
          მომსახურება თქვენს მისამართზე
        </dd>
      </dl>
      <Button type="button" variant="link" size="sm" onClick={onChange}>
        შეცვლა
      </Button>
    </div>
  )
}
