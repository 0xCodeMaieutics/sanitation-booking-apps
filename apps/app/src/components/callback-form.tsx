"use client"

import type { LocalDate } from "@sanitation/core/time"
import { Button, Field, FieldLabel, FieldLegend, FieldSet, Input } from "@sanitation/ui"
import { useMutation } from "@tanstack/react-query"
import { CheckIcon, PauseCircleIcon, PhoneCallIcon } from "lucide-react"
import Link from "next/link"
import { type FormEvent, useState } from "react"

import { errorMessage } from "@/lib/errors"
import { useTRPC } from "@/trpc/client"
import type { ServiceSummary } from "@/trpc/types"

import { BottomBar } from "./bottom-bar"
import { CodeStep, useSendCode } from "./code-step"
import { useCompany } from "./company"
import { type Contact, ContactFields, emptyContact, validateContact } from "./contact-fields"

const optionClassName =
  "flex min-h-12 items-center gap-3 rounded-xl bg-paper px-4 py-2 ring-1 ring-border has-checked:ring-2 has-checked:ring-brand"

/** The Callback Request form shown on a Paused Day. */
export function CallbackForm({
  date,
  services,
  preselectedServiceId,
}: {
  date: LocalDate
  services: ServiceSummary[]
  preselectedServiceId: string | null
}) {
  const trpc = useTRPC()
  const { slug } = useCompany()
  const [serviceIds, setServiceIds] = useState<string[]>(
    preselectedServiceId === null ? [] : [preselectedServiceId]
  )
  const [otherSelected, setOtherSelected] = useState(false)
  const [other, setOther] = useState("")
  const [contact, setContact] = useState<Contact>(emptyContact)
  const [errors, setErrors] = useState<ReturnType<typeof validateContact>>({})
  const [verificationId, setVerificationId] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const sendCode = useSendCode()
  const request = useMutation(trpc.requestCallback.mutationOptions({ onSuccess: () => setDone(true) }))

  if (done) {
    return (
      <div
        aria-live="polite"
        className="flex flex-col items-center gap-3 rounded-2xl bg-paper px-6 py-8 text-center ring-1 ring-border"
      >
        <span className="flex size-12 items-center justify-center rounded-full bg-success-soft text-success">
          <CheckIcon aria-hidden className="size-6" />
        </span>
        <h2 className="text-lg">მოთხოვნა მიღებულია</h2>
        <p className="text-ink-soft">მალე დაგიკავშირდებით.</p>
        <Button asChild variant="outline">
          <Link href={`/${slug}`}>მთავარზე დაბრუნება</Link>
        </Button>
      </div>
    )
  }

  if (verificationId !== null) {
    return (
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
            date,
            serviceIds,
            description: otherSelected ? other : "",
            clientName: contact.clientName,
            note: contact.note,
          })
        }
      />
    )
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const found = validateContact(contact, { name: false, address: false })
    setErrors(found)
    if (Object.keys(found).length > 0) return
    sendCode.mutate({ slug, phone: contact.phone }, { onSuccess: (r) => setVerificationId(r.verificationId) })
  }

  const toggle = (id: string) =>
    setServiceIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <div className="flex items-start gap-3 rounded-2xl bg-warning-soft p-4 text-ink">
        <PauseCircleIcon aria-hidden className="mt-0.5 size-5 shrink-0 text-warning" />
        <div className="flex flex-col gap-1">
          <p className="font-semibold">ამ დღეს შეიძლება ვერ მოვასწროთ</p>
          <p className="text-sm">
            თუ ამ დღეს აუცილებლად გჭირდებათ ჩვენი მომსახურება, შეავსეთ ფორმა და დაგიკავშირდებით. ან აირჩიეთ
            სხვა დღე.
          </p>
        </div>
      </div>

      <FieldSet>
        <FieldLegend variant="label">რა სამუშაო გჭირდებათ?</FieldLegend>
        <div className="flex flex-col gap-2">
          {services.map((s) => (
            <label key={s.id} className={optionClassName}>
              <input
                type="checkbox"
                checked={serviceIds.includes(s.id)}
                onChange={() => toggle(s.id)}
                className="size-5 accent-brand"
              />
              <span>{s.name}</span>
            </label>
          ))}
          <label className={optionClassName}>
            <input
              type="checkbox"
              checked={otherSelected}
              onChange={(e) => setOtherSelected(e.target.checked)}
              className="size-5 accent-brand"
            />
            <span>სხვა</span>
          </label>
        </div>
      </FieldSet>

      {otherSelected ? (
        <Field>
          <FieldLabel htmlFor="other">
            აღწერა <span className="font-normal text-ink-soft">(არასავალდებულო)</span>
          </FieldLabel>
          <Input
            id="other"
            value={other}
            onChange={(e) => setOther(e.target.value)}
            placeholder="აღწერეთ საკუთარი სიტყვებით"
            maxLength={1000}
          />
        </Field>
      ) : null}

      <ContactFields
        value={contact}
        onChange={setContact}
        errors={errors}
        show={{ name: "optional", address: false, noteLabel: "შენიშვნა" }}
      />

      {sendCode.error !== null ? (
        <p role="alert" className="text-sm text-danger">
          {errorMessage(sendCode.error)}
        </p>
      ) : null}

      <BottomBar>
        <Button type="submit" variant="cta" size="lg" className="w-full" disabled={sendCode.isPending}>
          <PhoneCallIcon aria-hidden />
          {sendCode.isPending ? "იგზავნება…" : "დამიკავშირდით"}
        </Button>
      </BottomBar>
    </form>
  )
}
