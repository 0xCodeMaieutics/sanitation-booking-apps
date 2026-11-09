"use client"

import { type LocalDate, formatDate, formatDateTime, formatHour, toLocalHour } from "@sanitation/core/time"
import { Button, Field, FieldDescription, FieldError, FieldLabel, Input, Textarea } from "@sanitation/ui"
import { useMutation } from "@tanstack/react-query"
import { CheckIcon, InfoIcon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { type FormEvent, useState } from "react"

import { BottomBar } from "@/components/bottom-bar"
import { CallbackForm } from "@/components/callback-form"
import { CodeStep, useSendCode } from "@/components/code-step"
import { useCompany } from "@/components/company"
import { type Contact, ContactFields, emptyContact, validateContact } from "@/components/contact-fields"
import { DayStrip } from "@/components/day-strip"
import { StepHeader } from "@/components/step-header"
import { TimeGrid } from "@/components/time-grid"
import { firstUsefulDate } from "@/lib/days"
import { domainCodeOf, errorMessage } from "@/lib/errors"
import { useTRPC } from "@/trpc/client"
import type { Availability, ServiceSummary } from "@/trpc/types"

type Step = "describe" | "time" | "details" | "code" | "done"

const emptyDescribe =
  process.env.NODE_ENV === "development"
    ? { description: "სარდაფში წყალი დგას, საჭიროა ამოტუმბვა", address: "თბილისი, ჭავჭავაძის გამზ. 1" }
    : { description: "", address: "" }

/** A Client asking for a Custom Service: the Admin calls back and turns it into a Booking. */
export function CustomFlow({ services, days }: { services: ServiceSummary[]; days: Availability }) {
  const trpc = useTRPC()
  const router = useRouter()
  const { slug } = useCompany()
  const [step, setStep] = useState<Step>("describe")
  const [description, setDescription] = useState(emptyDescribe.description)
  const [address, setAddress] = useState(emptyDescribe.address)
  const [describeErrors, setDescribeErrors] = useState<{ description?: string; address?: string }>({})
  const [date, setDate] = useState<LocalDate>(() => firstUsefulDate(days))
  const [time, setTime] = useState<Date | null>(null)
  const [timeError, setTimeError] = useState<string | null>(null)
  const [contact, setContact] = useState<Contact>(emptyContact)
  const [errors, setErrors] = useState<ReturnType<typeof validateContact>>({})
  const [verificationId, setVerificationId] = useState<string | null>(null)
  const sendCode = useSendCode()
  const request = useMutation(
    trpc.requestCustom.mutationOptions({
      onSuccess: () => setStep("done"),
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

  if (step === "done" && time !== null) {
    return (
      <div
        aria-live="polite"
        className="flex flex-col items-center gap-3 rounded-2xl bg-paper px-6 py-8 text-center ring-1 ring-border"
      >
        <span className="flex size-12 items-center justify-center rounded-full bg-success-soft text-success">
          <CheckIcon aria-hidden className="size-6" />
        </span>
        <h1 className="text-xl">მოთხოვნა გაგზავნილია</h1>
        <p className="text-ink-soft">
          სასურველი დრო: <span className="font-semibold text-ink">{formatDateTime(time)}</span>
        </p>
        <p className="text-ink-soft">
          დაგიკავშირდებით სამუშაოს, დროისა და ფასის შესათანხმებლად. დადასტურების შემდეგ მიიღებთ SMS-ს.
        </p>
        <Button asChild variant="outline">
          <Link href={`/${slug}`}>მთავარზე დაბრუნება</Link>
        </Button>
      </div>
    )
  }

  if (step === "code" && verificationId !== null && time !== null) {
    return (
      <div className="flex flex-col gap-5">
        <StepHeader title="დადასტურება" step={4} of={4} onBack={() => setStep("details")} />
        <CodeStep
          phone={contact.phone}
          onResent={setVerificationId}
          isSubmitting={request.isPending}
          submitError={request.error}
          submitLabel="მოთხოვნის გაგზავნა"
          onSubmit={(code) =>
            request.mutate({
              slug,
              phone: contact.phone,
              verificationId,
              code,
              description,
              address,
              desiredStartsAt: time,
              clientName: contact.clientName,
              note: contact.note,
            })
          }
        />
      </div>
    )
  }

  if (step === "details" && time !== null) {
    const submit = (e: FormEvent) => {
      e.preventDefault()
      const found = validateContact(contact, { name: true, address: false })
      setErrors(found)
      if (Object.keys(found).length > 0) return
      sendCode.mutate(
        { slug, phone: contact.phone },
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
        <StepHeader title="თქვენი მონაცემები" step={3} of={4} onBack={() => setStep("time")} />
        <div className="rounded-2xl bg-paper p-4 text-sm ring-1 ring-border">
          <p className="font-semibold">{description}</p>
          <p className="text-ink-soft">
            {address} · {formatDateTime(time)}
          </p>
        </div>
        <ContactFields
          value={contact}
          onChange={setContact}
          errors={errors}
          show={{ name: "required", address: false, noteLabel: "შენიშვნა" }}
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

  if (step === "time") {
    const day = days.find((d) => d.date === date)
    return (
      <div className="flex flex-col gap-5">
        <StepHeader title="სასურველი დრო" step={2} of={4} onBack={() => setStep("describe")} />
        <section className="flex flex-col gap-3" aria-label="დღე">
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
          <CallbackForm key={date} services={services} preselectedServiceId={null} />
        ) : (
          <section className="flex flex-col gap-3" aria-labelledby="time-heading">
            <h2 id="time-heading" className="text-base">
              {formatDate(date)}
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

  const submitDescribe = (e: FormEvent) => {
    e.preventDefault()
    const found: typeof describeErrors = {}
    if (description.trim().length < 3) found.description = "აღწერეთ, რა სამუშაო გჭირდებათ."
    if (address.trim().length < 3) found.address = "მიუთითეთ მისამართი."
    setDescribeErrors(found)
    if (Object.keys(found).length === 0) setStep("time")
  }

  return (
    <form onSubmit={submitDescribe} className="flex flex-col gap-5" noValidate>
      <StepHeader title="სხვა სამუშაო" step={1} of={4} backHref={`/${slug}`} />
      <div className="flex items-start gap-3 rounded-2xl bg-mist p-4 text-sm">
        <InfoIcon aria-hidden className="mt-0.5 size-5 shrink-0 text-brand" />
        <p>აღწერეთ სამუშაო და აირჩიეთ სასურველი დრო. დაგიკავშირდებით, შეგითანხმებთ ხანგრძლივობას და ფასს.</p>
      </div>
      <Field data-invalid={describeErrors.description !== undefined}>
        <FieldLabel htmlFor="description">რა გჭირდებათ?</FieldLabel>
        <Textarea
          id="description"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="მაგ. სარდაფში წყალი დგას და საჭიროა ამოტუმბვა"
          maxLength={1000}
          aria-invalid={describeErrors.description !== undefined}
        />
        {describeErrors.description !== undefined ? (
          <FieldError>{describeErrors.description}</FieldError>
        ) : null}
      </Field>
      <Field data-invalid={describeErrors.address !== undefined}>
        <FieldLabel htmlFor="address">მისამართი</FieldLabel>
        <Input
          id="address"
          autoComplete="street-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="ქალაქი, ქუჩა, სახლის ნომერი"
          aria-invalid={describeErrors.address !== undefined}
          aria-describedby="address-help"
        />
        {describeErrors.address !== undefined ? (
          <FieldError>{describeErrors.address}</FieldError>
        ) : (
          <FieldDescription id="address-help">სად უნდა მოვიდეს ხელოსანი.</FieldDescription>
        )}
      </Field>
      <BottomBar>
        <Button type="submit" variant="cta" size="lg" className="w-full">
          გაგრძელება
        </Button>
      </BottomBar>
    </form>
  )
}
