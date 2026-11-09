"use client"

import { normalizePhone } from "@sanitation/core/phone"
import { Field, FieldDescription, FieldError, FieldLabel, Input, Textarea } from "@sanitation/ui"

export type Contact = { clientName: string; phone: string; address: string; note: string }

export const emptyContact: Contact =
  process.env.NODE_ENV === "development"
    ? { clientName: "ტესტ კლიენტი", phone: "555 12 34 56", address: "", note: "" }
    : { clientName: "", phone: "", address: "", note: "" }

type ContactErrors = Partial<Record<keyof Contact, string>>

export function isValidPhone(phone: string): boolean {
  try {
    normalizePhone(phone)
    return true
  } catch {
    return false
  }
}

export function validateContact(c: Contact, required: { name: boolean; address: boolean }): ContactErrors {
  const errors: ContactErrors = {}
  if (required.name && c.clientName.trim().length < 2) errors.clientName = "მიუთითეთ სახელი."
  if (!isValidPhone(c.phone)) errors.phone = "შეიყვანეთ ქართული მობილურის ნომერი, მაგ. 555 12 34 56."
  if (required.address && c.address.trim().length < 3) errors.address = "მიუთითეთ მისამართი."
  return errors
}

/** Name, phone, address and note, with errors shown under each field. */
export function ContactFields({
  value,
  onChange,
  errors,
  show,
}: {
  value: Contact
  onChange: (value: Contact) => void
  errors: ContactErrors
  show: { name: "required" | "optional"; address: boolean; noteLabel: string }
}) {
  const set = (key: keyof Contact) => (e: { target: { value: string } }) =>
    onChange({ ...value, [key]: e.target.value })

  return (
    <div className="flex flex-col gap-4">
      <Field data-invalid={errors.clientName !== undefined}>
        <FieldLabel htmlFor="clientName">
          სახელი
          {show.name === "optional" ? (
            <span className="font-normal text-ink-soft"> (არასავალდებულო)</span>
          ) : null}
        </FieldLabel>
        <Input
          id="clientName"
          autoComplete="name"
          value={value.clientName}
          onChange={set("clientName")}
          aria-invalid={errors.clientName !== undefined}
        />
        {errors.clientName !== undefined ? <FieldError>{errors.clientName}</FieldError> : null}
      </Field>

      <Field data-invalid={errors.phone !== undefined}>
        <FieldLabel htmlFor="phone">მობილურის ნომერი</FieldLabel>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-soft">
            +995
          </span>
          <Input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="555 12 34 56"
            value={value.phone}
            onChange={set("phone")}
            className="pl-14"
            aria-invalid={errors.phone !== undefined}
            aria-describedby="phone-help"
          />
        </div>
        {errors.phone !== undefined ? (
          <FieldError>{errors.phone}</FieldError>
        ) : (
          <FieldDescription id="phone-help">ამ ნომერზე მიიღებთ SMS კოდს.</FieldDescription>
        )}
      </Field>

      {show.address ? (
        <Field data-invalid={errors.address !== undefined}>
          <FieldLabel htmlFor="address">მისამართი</FieldLabel>
          <Input
            id="address"
            autoComplete="street-address"
            placeholder="ქალაქი, ქუჩა, სახლის ნომერი"
            value={value.address}
            onChange={set("address")}
            aria-invalid={errors.address !== undefined}
          />
          {errors.address !== undefined ? <FieldError>{errors.address}</FieldError> : null}
        </Field>
      ) : null}

      <Field>
        <FieldLabel htmlFor="note">
          {show.noteLabel} <span className="font-normal text-ink-soft">(არასავალდებულო)</span>
        </FieldLabel>
        <Textarea id="note" rows={3} value={value.note} onChange={set("note")} maxLength={1000} />
      </Field>
    </div>
  )
}
