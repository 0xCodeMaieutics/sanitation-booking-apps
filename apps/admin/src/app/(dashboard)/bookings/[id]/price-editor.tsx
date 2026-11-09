"use client"

import { Button, Field, FieldDescription, FieldError, FieldLabel, Input } from "@sanitation/ui"
import { type FormEvent, useState } from "react"

import { errorMessage } from "@/lib/errors"
import { useTRPC } from "@/trpc/client"
import { useRefreshingMutation } from "@/trpc/use-refreshing-mutation"

/** The Booking Price: what this visit costs, for the Admin's own tracking. */
export function PriceEditor({ bookingId, priceGel }: { bookingId: string; priceGel: number | null }) {
  const trpc = useTRPC()
  const [value, setValue] = useState(priceGel === null ? "" : String(priceGel))
  const [saved, setSaved] = useState(false)
  const save = useRefreshingMutation(
    trpc.bookings.setPrice.mutationOptions({ onSuccess: () => setSaved(true) })
  )
  const dirty = value !== (priceGel === null ? "" : String(priceGel))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    save.mutate({ bookingId, priceGel: value === "" ? null : Number(value) })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-2xl bg-paper p-4 ring-1 ring-border">
      <Field>
        <FieldLabel htmlFor="price">ფასი (₾)</FieldLabel>
        <div className="flex gap-2">
          <Input
            id="price"
            inputMode="numeric"
            value={value}
            onChange={(e) => {
              setValue(e.target.value.replace(/\D/g, ""))
              setSaved(false)
            }}
            placeholder="მიუთითეთ ფასი"
            aria-describedby="price-help"
          />
          <Button type="submit" variant="outline" disabled={!dirty || save.isPending}>
            {save.isPending ? "ინახება…" : "შენახვა"}
          </Button>
        </div>
        {save.error !== null ? (
          <FieldError>{errorMessage(save.error)}</FieldError>
        ) : (
          <FieldDescription id="price-help">
            {saved && !dirty ? "შენახულია." : "კლიენტი ამ ფასს ვერ ხედავს."}
          </FieldDescription>
        )}
      </Field>
    </form>
  )
}
