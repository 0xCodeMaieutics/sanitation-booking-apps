"use client"

import { formatHour } from "@sanitation/core/time"
import {
  Button,
  Field,
  FieldError,
  FieldLabel,
  Input,
  NativeSelect,
  NativeSelectOption,
  cn,
} from "@sanitation/ui"
import { PlusIcon } from "lucide-react"
import { type FormEvent, useState } from "react"

import { errorMessage } from "@/lib/errors"
import { useTRPC } from "@/trpc/client"
import { useRefreshingMutation } from "@/trpc/use-refreshing-mutation"

export function AddTimeOff({ today }: { today: string }) {
  const trpc = useTRPC()
  const [date, setDate] = useState(today)
  const [wholeDay, setWholeDay] = useState(true)
  const [fromHour, setFromHour] = useState(9)
  const [toHour, setToHour] = useState(13)
  const [note, setNote] = useState("")
  const add = useRefreshingMutation(trpc.timeOff.add.mutationOptions({ onSuccess: () => setNote("") }))
  const rangeInvalid = !wholeDay && toHour <= fromHour

  const submit = (e: FormEvent) => {
    e.preventDefault()
    add.mutate({
      date,
      fromHour: wholeDay ? null : fromHour,
      toHour: wholeDay ? null : toHour,
      note,
    })
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-4 rounded-2xl bg-paper p-4 ring-1 ring-border"
      noValidate
    >
      <Field>
        <FieldLabel htmlFor="date">თარიღი</FieldLabel>
        <Input id="date" type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>

      <div
        role="radiogroup"
        aria-label="ხანგრძლივობა"
        className="grid grid-cols-2 gap-1 rounded-xl bg-mist p-1"
      >
        {[
          { value: true, label: "მთელი დღე" },
          { value: false, label: "საათები" },
        ].map((o) => (
          <label
            key={String(o.value)}
            className={cn(
              "flex min-h-11 cursor-pointer items-center justify-center rounded-lg text-sm transition-colors duration-150 has-focus-visible:ring-2 has-focus-visible:ring-ring",
              wholeDay === o.value ? "bg-paper font-semibold text-ink shadow-sm" : "text-ink-soft"
            )}
          >
            <input
              type="radio"
              name="span"
              className="sr-only"
              checked={wholeDay === o.value}
              onChange={() => setWholeDay(o.value)}
            />
            {o.label}
          </label>
        ))}
      </div>

      {wholeDay ? null : (
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor="from">დან</FieldLabel>
            <NativeSelect
              id="from"
              className="w-full"
              value={fromHour}
              onChange={(e) => setFromHour(Number(e.target.value))}
            >
              {Array.from({ length: 24 }, (_, h) => (
                <NativeSelectOption key={h} value={h}>
                  {formatHour(h)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="to">მდე</FieldLabel>
            <NativeSelect
              id="to"
              className="w-full"
              value={toHour}
              onChange={(e) => setToHour(Number(e.target.value))}
            >
              {Array.from({ length: 24 }, (_, i) => i + 1).map((h) => (
                <NativeSelectOption key={h} value={h}>
                  {formatHour(h % 24)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        </div>
      )}

      <Field>
        <FieldLabel htmlFor="note">
          შენიშვნა <span className="font-normal text-ink-soft">(მხოლოდ თქვენთვის)</span>
        </FieldLabel>
        <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
      </Field>

      {rangeInvalid ? <FieldError>„მდე“ უნდა იყოს „დან“-ზე გვიან.</FieldError> : null}
      {add.error !== null ? <FieldError>{errorMessage(add.error)}</FieldError> : null}

      <Button type="submit" disabled={add.isPending || rangeInvalid}>
        <PlusIcon aria-hidden />
        {add.isPending ? "ემატება…" : "დამატება"}
      </Button>
    </form>
  )
}
