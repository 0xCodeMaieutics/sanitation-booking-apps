"use client"

import type { Conflict } from "@sanitation/core"
import { type LocalDate, formatHour, toLocalHour } from "@sanitation/core/time"
import {
  Button,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  Input,
  NativeSelect,
  NativeSelectOption,
  Textarea,
} from "@sanitation/ui"
import { AlertTriangleIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { type FormEvent, useState } from "react"

import { conflictsOf, domainCodeOf, errorMessage } from "@/lib/errors"
import { formatDuration, formatPrice } from "@/lib/format"
import { useTRPC } from "@/trpc/client"
import type { AdminService } from "@/trpc/types"
import { useRefreshingMutation } from "@/trpc/use-refreshing-mutation"

import { ConfirmDialog } from "./confirm-dialog"

const CUSTOM = "custom"

export type AdminBookingDefaults = {
  serviceId: string | null
  customService: string
  date: LocalDate
  hour: number
  durationHours: number | null
  clientName: string
  phone: string
  address: string
  note: string
}

/**
 * An Admin Booking, typed in by the Admin or made by accepting a Callback Request.
 * If it overlaps other Bookings or Time Off, the Admin is warned and decides.
 */
export function AdminBookingForm({
  services,
  defaults,
  callbackRequestId,
  submitLabel,
}: {
  services: AdminService[]
  defaults: AdminBookingDefaults
  callbackRequestId?: string
  submitLabel: string
}) {
  const trpc = useTRPC()
  const router = useRouter()
  const active = services.filter((s) => s.archivedAt === null)
  const [serviceId, setServiceId] = useState<string>(defaults.serviceId ?? CUSTOM)
  const [customService, setCustomService] = useState(defaults.customService)
  const [date, setDate] = useState(defaults.date)
  const [hour, setHour] = useState(defaults.hour)
  const selected = active.find((s) => s.id === serviceId)
  const [duration, setDuration] = useState(String(defaults.durationHours ?? selected?.durationHours ?? ""))
  const [price, setPrice] = useState(selected === undefined ? "" : String(selected.priceGel))
  const [clientName, setClientName] = useState(defaults.clientName)
  const [phone, setPhone] = useState(defaults.phone)
  const [address, setAddress] = useState(defaults.address)
  const [note, setNote] = useState(defaults.note)
  const [conflicts, setConflicts] = useState<Conflict[] | null>(null)
  const [invalid, setInvalid] = useState<string | null>(null)

  const create = useRefreshingMutation(
    trpc.bookings.create.mutationOptions({
      onSuccess: ({ bookingId }) => router.push(`/bookings/${bookingId}`),
      onError: (error) => {
        if (domainCodeOf(error) === "OVERLAP") setConflicts(conflictsOf(error))
      },
    })
  )

  const pickService = (id: string) => {
    setServiceId(id)
    const svc = active.find((s) => s.id === id)
    if (svc !== undefined) {
      setDuration(String(svc.durationHours))
      setPrice(String(svc.priceGel))
    }
  }

  const send = (allowOverlap: boolean) => {
    const isCustom = serviceId === CUSTOM
    if (isCustom && customService.trim().length < 2) return setInvalid("აღწერეთ სამუშაო.")
    if (isCustom && duration === "") return setInvalid("მიუთითეთ სავარაუდო ხანგრძლივობა.")
    setInvalid(null)
    create.mutate({
      service: isCustom ? { customService } : { serviceId },
      date,
      hour,
      durationHours: duration === "" ? undefined : Number(duration),
      priceGel: price === "" ? null : Number(price),
      clientName,
      phone,
      address,
      note,
      allowOverlap,
      callbackRequestId,
    })
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    send(false)
  }

  const showError = create.error !== null && domainCodeOf(create.error) !== "OVERLAP"

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <Field>
        <FieldLabel htmlFor="service">სერვისი</FieldLabel>
        <NativeSelect
          id="service"
          className="w-full"
          value={serviceId}
          onChange={(e) => pickService(e.target.value)}
        >
          {active.map((s) => (
            <NativeSelectOption key={s.id} value={s.id}>
              {s.name} · {formatDuration(s.durationHours)} · {formatPrice(s.priceGel)}
            </NativeSelectOption>
          ))}
          <NativeSelectOption value={CUSTOM}>ინდივიდუალური სამუშაო</NativeSelectOption>
        </NativeSelect>
      </Field>

      {serviceId === CUSTOM ? (
        <Field>
          <FieldLabel htmlFor="customService">სამუშაოს აღწერა</FieldLabel>
          <Textarea
            id="customService"
            rows={2}
            value={customService}
            onChange={(e) => setCustomService(e.target.value)}
            maxLength={300}
          />
        </Field>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel htmlFor="date">თარიღი</FieldLabel>
          <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </Field>
        <Field>
          <FieldLabel htmlFor="hour">დაწყება</FieldLabel>
          <NativeSelect
            id="hour"
            className="w-full"
            value={hour}
            onChange={(e) => setHour(Number(e.target.value))}
          >
            {Array.from({ length: 24 }, (_, h) => (
              <NativeSelectOption key={h} value={h}>
                {formatHour(h)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="duration">
            {serviceId === CUSTOM ? "სავარაუდო ხანგრძლივობა" : "ხანგრძლივობა"}
          </FieldLabel>
          <NativeSelect
            id="duration"
            className="w-full"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          >
            {serviceId === CUSTOM ? <NativeSelectOption value="">აირჩიეთ</NativeSelectOption> : null}
            {Array.from({ length: 12 }, (_, i) => (
              <NativeSelectOption key={i + 1} value={String(i + 1)}>
                {formatDuration(i + 1)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="price">ფასი (₾)</FieldLabel>
          <Input
            id="price"
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))}
            placeholder="—"
          />
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor="clientName">კლიენტის სახელი</FieldLabel>
        <Input id="clientName" value={clientName} onChange={(e) => setClientName(e.target.value)} />
      </Field>
      <Field>
        <FieldLabel htmlFor="phone">მობილური</FieldLabel>
        <Input
          id="phone"
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="555 12 34 56"
          aria-describedby="phone-help"
        />
        <FieldDescription id="phone-help">კლიენტი მიიღებს დადასტურების SMS-ს.</FieldDescription>
      </Field>
      <Field>
        <FieldLabel htmlFor="address">მისამართი</FieldLabel>
        <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
      </Field>
      <Field>
        <FieldLabel htmlFor="note">
          შენიშვნა <span className="font-normal text-ink-soft">(არასავალდებულო)</span>
        </FieldLabel>
        <Textarea
          id="note"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={1000}
        />
      </Field>

      {invalid !== null ? <FieldError>{invalid}</FieldError> : null}
      {showError ? <FieldError>{errorMessage(create.error)}</FieldError> : null}

      <Button type="submit" size="lg" disabled={create.isPending}>
        {create.isPending ? "ინახება…" : submitLabel}
      </Button>

      <ConfirmDialog
        open={conflicts !== null}
        onOpenChange={(open) => !open && setConflicts(null)}
        title="დრო გადაიფარება"
        description="ეს ჯავშანი ემთხვევა:"
        confirmLabel="მაინც შექმნა"
        destructive
        pending={create.isPending}
        error={null}
        onConfirm={() => send(true)}
      >
        <ul className="flex flex-col gap-2">
          {(conflicts ?? []).map((c) => (
            <li
              key={`${c.kind}-${new Date(c.startsAt).getTime()}`}
              className="flex items-start gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm"
            >
              <AlertTriangleIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-danger" />
              <span>
                {c.kind === "timeOff"
                  ? `არასამუშაო დრო: ${formatHour(toLocalHour(new Date(c.startsAt)))}–${formatHour(toLocalHour(new Date(c.endsAt)))}`
                  : c.label}
              </span>
            </li>
          ))}
        </ul>
      </ConfirmDialog>
    </form>
  )
}
