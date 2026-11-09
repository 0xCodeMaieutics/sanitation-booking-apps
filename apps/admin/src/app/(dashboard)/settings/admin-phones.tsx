"use client"

import { formatPhone } from "@sanitation/core/phone"
import { Badge, Button, Field, FieldError, FieldLabel, Input } from "@sanitation/ui"
import { BellIcon, BellOffIcon, Trash2Icon } from "lucide-react"
import { useRouter } from "next/navigation"
import { type FormEvent, useState } from "react"

import { ConfirmDialog } from "@/components/confirm-dialog"
import { errorMessage } from "@/lib/errors"
import { useTRPC } from "@/trpc/client"
import type { AdminPhone } from "@/trpc/types"
import { useRefreshingMutation } from "@/trpc/use-refreshing-mutation"

/** The Company's Admin Phones: who can sign in, and who gets Admin Alerts. */
export function AdminPhones({ phones, currentId }: { phones: AdminPhone[]; currentId: string }) {
  return (
    <section
      aria-labelledby="admin-phones-heading"
      className="flex flex-col gap-4 rounded-2xl bg-paper p-4 ring-1 ring-border"
    >
      <div className="flex flex-col gap-1">
        <h2 id="admin-phones-heading" className="text-base">
          ადმინისტრატორის ნომრები
        </h2>
        <p className="text-sm text-ink-soft">
          ამ ნომრებით შეიძლება შესვლა. შეტყობინებებს ახალი ჯავშნისა და მოთხოვნის შესახებ მიიღებენ მხოლოდ
          ჩართული ნომრები.
        </p>
      </div>
      <ul className="flex flex-col divide-y divide-border">
        {phones.map((p) => (
          <PhoneRow key={p.id} phone={p} isCurrent={p.id === currentId} />
        ))}
      </ul>
      <AddPhone />
    </section>
  )
}

function PhoneRow({ phone, isCurrent }: { phone: AdminPhone; isCurrent: boolean }) {
  const trpc = useTRPC()
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const setAlerts = useRefreshingMutation(trpc.adminPhones.setAlerts.mutationOptions())
  const remove = useRefreshingMutation(
    trpc.adminPhones.remove.mutationOptions({
      onSuccess: () => {
        setConfirming(false)
        if (isCurrent) router.replace("/sign-in")
      },
    })
  )

  return (
    <li className="flex flex-col gap-2 py-3 first:pt-0">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-medium whitespace-nowrap tabular-nums">{formatPhone(phone.phone)}</span>
        {isCurrent ? <Badge variant="muted">თქვენ</Badge> : null}
        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-pressed={phone.alerts}
            disabled={setAlerts.isPending}
            onClick={() => setAlerts.mutate({ adminPhoneId: phone.id, alerts: !phone.alerts })}
          >
            {phone.alerts ? <BellIcon aria-hidden className="text-brand" /> : <BellOffIcon aria-hidden />}
            {phone.alerts ? "შეტყობინებები ჩართულია" : "შეტყობინებები გამორთულია"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="ნომრის წაშლა"
            onClick={() => setConfirming(true)}
          >
            <Trash2Icon aria-hidden className="text-danger" />
          </Button>
        </div>
      </div>
      {setAlerts.error !== null ? <FieldError>{errorMessage(setAlerts.error)}</FieldError> : null}
      <ConfirmDialog
        open={confirming}
        onOpenChange={(open) => {
          setConfirming(open)
          if (!open) remove.reset()
        }}
        title="წავშალოთ ნომერი?"
        description={
          isCurrent
            ? "ეს თქვენი ნომერია: ყველა მოწყობილობიდან გამოხვალთ და ამ ნომრით ვეღარ შეხვალთ."
            : "ამ ნომრით შესული ყველა მოწყობილობა გამოვა სისტემიდან."
        }
        confirmLabel="წაშლა"
        destructive
        pending={remove.isPending}
        error={remove.error !== null ? errorMessage(remove.error) : null}
        onConfirm={() => remove.mutate({ adminPhoneId: phone.id })}
      />
    </li>
  )
}

function AddPhone() {
  const trpc = useTRPC()
  const [phone, setPhone] = useState("")
  const [alerts, setAlerts] = useState(true)
  const add = useRefreshingMutation(
    trpc.adminPhones.add.mutationOptions({
      onSuccess: () => {
        setPhone("")
        setAlerts(true)
      },
    })
  )

  const submit = (e: FormEvent) => {
    e.preventDefault()
    add.mutate({ phone, alerts })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 border-t border-border pt-4" noValidate>
      <Field data-invalid={add.error !== null}>
        <FieldLabel htmlFor="new-admin-phone">ახალი ნომერი</FieldLabel>
        <Input
          id="new-admin-phone"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          placeholder="555 12 34 56"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          aria-invalid={add.error !== null}
        />
        {add.error !== null ? <FieldError>{errorMessage(add.error)}</FieldError> : null}
      </Field>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
        <input
          type="checkbox"
          className="size-5 accent-brand"
          checked={alerts}
          onChange={(e) => setAlerts(e.target.checked)}
        />
        შეტყობინებების მიღება ამ ნომერზე
      </label>
      <Button type="submit" variant="outline" disabled={add.isPending || phone.trim().length < 9}>
        {add.isPending ? "ემატება…" : "ნომრის დამატება"}
      </Button>
    </form>
  )
}
