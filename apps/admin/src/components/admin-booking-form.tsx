"use client"

import type { Conflict } from "@sanitation/core"
import { normalizePhone } from "@sanitation/core/phone"
import {
  type LocalDate,
  addHours,
  formatHour,
  isLocalDate,
  localInstant,
  toLocalHour,
} from "@sanitation/core/time"
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

/** Keyed by the field's element id, so the first one can be focused. */
type FieldErrors = Partial<
  Record<"customService" | "date" | "hour" | "duration" | "clientName" | "phone" | "address", string>
>

function isValidPhone(phone: string): boolean {
  try {
    normalizePhone(phone)
    return true
  } catch {
    return false
  }
}

export type AdminBookingDefaults = {
  serviceId: string | null
  customService: string
  date: LocalDate
  /** Null leaves the start time for the Admin to choose. */
  hour: number | null
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
  occupied,
  defaults,
  callbackRequestId,
  submitLabel,
}: {
  services: AdminService[]
  /** Taken time; start hours and durations that would run into it are hidden unless the Admin asks to see them. */
  occupied: { startsAt: Date; endsAt: Date }[]
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
  const [errors, setErrors] = useState<FieldErrors>({})
  const [showTaken, setShowTaken] = useState(false)

  const fits = (h: number, durationHours: number) => {
    if (!isLocalDate(date)) return true
    const startsAt = localInstant(date, h)
    const endsAt = addHours(startsAt, durationHours)
    return occupied.every((o) => o.endsAt <= startsAt || endsAt <= o.startsAt)
  }
  const isFree = (h: number) => fits(h, duration === "" ? 1 : Number(duration))
  const hours = Array.from({ length: 24 }, (_, h) => h).filter((h) => showTaken || h === hour || isFree(h))
  const durations = Array.from({ length: 12 }, (_, i) => i + 1).filter(
    (d) => showTaken || hour === null || String(d) === duration || fits(hour, d)
  )
  const durationLabel = (d: number) => {
    if (hour === null) return formatDuration(d)
    const label = `${formatDuration(d)} · ${formatHour(hour)}–${formatHour((hour + d) % 24)}`
    return fits(hour, d) ? label : `${label} · დაკავებულია`
  }

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

  const validate = (): FieldErrors => {
    const isCustom = serviceId === CUSTOM
    const found: FieldErrors = {}
    if (isCustom && customService.trim().length < 2) found.customService = "აღწერეთ სამუშაო."
    if (!isLocalDate(date)) found.date = "მიუთითეთ თარიღი."
    if (hour === null) found.hour = "მიუთითეთ დაწყების დრო."
    if (isCustom && duration === "") found.duration = "მიუთითეთ სავარაუდო ხანგრძლივობა."
    if (clientName.trim().length < 2) found.clientName = "მიუთითეთ კლიენტის სახელი."
    if (!isValidPhone(phone)) found.phone = "შეიყვანეთ ქართული მობილურის ნომერი, მაგ. 555 12 34 56."
    if (address.trim().length < 3) found.address = "მიუთითეთ მისამართი."
    return found
  }

  const send = (allowOverlap: boolean) => {
    const isCustom = serviceId === CUSTOM
    const found = validate()
    setErrors(found)
    const firstInvalid = Object.keys(found)[0]
    if (firstInvalid !== undefined) document.getElementById(firstInvalid)?.focus()
    if (firstInvalid !== undefined || hour === null) return
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
        <Field data-invalid={errors.customService !== undefined}>
          <FieldLabel htmlFor="customService">სამუშაოს აღწერა</FieldLabel>
          <Textarea
            id="customService"
            rows={2}
            value={customService}
            onChange={(e) => setCustomService(e.target.value)}
            maxLength={300}
            aria-invalid={errors.customService !== undefined}
          />
          {errors.customService !== undefined ? <FieldError>{errors.customService}</FieldError> : null}
        </Field>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <Field data-invalid={errors.date !== undefined}>
          <FieldLabel htmlFor="date">თარიღი</FieldLabel>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            aria-invalid={errors.date !== undefined}
          />
          {errors.date !== undefined ? <FieldError>{errors.date}</FieldError> : null}
        </Field>
        <Field data-invalid={errors.hour !== undefined}>
          <FieldLabel htmlFor="hour">დაწყება</FieldLabel>
          <NativeSelect
            id="hour"
            className="w-full"
            value={hour ?? ""}
            onChange={(e) => setHour(e.target.value === "" ? null : Number(e.target.value))}
            aria-invalid={errors.hour !== undefined}
          >
            {hour === null ? <NativeSelectOption value="">აირჩიეთ</NativeSelectOption> : null}
            {hours.map((h) => (
              <NativeSelectOption key={h} value={h}>
                {isFree(h) ? formatHour(h) : `${formatHour(h)} · დაკავებულია`}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {errors.hour !== undefined ? (
            <FieldError>{errors.hour}</FieldError>
          ) : hours.length === 0 ? (
            <FieldDescription>ამ დღეს თავისუფალი დრო აღარ არის.</FieldDescription>
          ) : null}
        </Field>
        <Field data-invalid={errors.duration !== undefined}>
          <FieldLabel htmlFor="duration">
            {serviceId === CUSTOM ? "სავარაუდო ხანგრძლივობა" : "ხანგრძლივობა"}
          </FieldLabel>
          <NativeSelect
            id="duration"
            className="w-full"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            aria-invalid={errors.duration !== undefined}
          >
            {serviceId === CUSTOM ? <NativeSelectOption value="">აირჩიეთ</NativeSelectOption> : null}
            {durations.map((d) => (
              <NativeSelectOption key={d} value={String(d)}>
                {durationLabel(d)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {errors.duration !== undefined ? <FieldError>{errors.duration}</FieldError> : null}
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
      <label className="-mt-2 flex min-h-11 cursor-pointer items-center gap-3 text-sm">
        <input
          type="checkbox"
          className="size-5 accent-brand"
          checked={showTaken}
          onChange={(e) => setShowTaken(e.target.checked)}
        />
        დაკავებული დროის ჩვენებაც
      </label>

      <Field data-invalid={errors.clientName !== undefined}>
        <FieldLabel htmlFor="clientName">კლიენტის სახელი</FieldLabel>
        <Input
          id="clientName"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          maxLength={120}
          aria-invalid={errors.clientName !== undefined}
        />
        {errors.clientName !== undefined ? <FieldError>{errors.clientName}</FieldError> : null}
      </Field>
      <Field data-invalid={errors.phone !== undefined}>
        <FieldLabel htmlFor="phone">მობილური</FieldLabel>
        <Input
          id="phone"
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="555 12 34 56"
          maxLength={20}
          aria-invalid={errors.phone !== undefined}
          aria-describedby="phone-help"
        />
        {errors.phone !== undefined ? (
          <FieldError>{errors.phone}</FieldError>
        ) : (
          <FieldDescription id="phone-help">კლიენტი მიიღებს დადასტურების SMS-ს.</FieldDescription>
        )}
      </Field>
      <Field data-invalid={errors.address !== undefined}>
        <FieldLabel htmlFor="address">მისამართი</FieldLabel>
        <Input
          id="address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          maxLength={300}
          aria-invalid={errors.address !== undefined}
        />
        {errors.address !== undefined ? <FieldError>{errors.address}</FieldError> : null}
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
