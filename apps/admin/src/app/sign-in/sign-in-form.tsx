"use client"

import { Button, Field, FieldError, FieldLabel, Input } from "@sanitation/ui"
import { useMutation } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { type FormEvent, useState } from "react"

import { errorMessage } from "@/lib/errors"
import { useTRPC } from "@/trpc/client"

export function SignInForm({ defaultPhone }: { defaultPhone: string }) {
  const trpc = useTRPC()
  const router = useRouter()
  const [phone, setPhone] = useState(defaultPhone)
  const [code, setCode] = useState("")
  const [verificationId, setVerificationId] = useState<string | null>(null)
  const sendCode = useMutation(
    trpc.auth.sendCode.mutationOptions({ onSuccess: (r) => setVerificationId(r.verificationId) })
  )
  const signIn = useMutation(
    trpc.auth.signIn.mutationOptions({
      onSuccess: () => {
        router.replace("/")
        router.refresh()
      },
    })
  )

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (verificationId === null) sendCode.mutate({ phone })
    else signIn.mutate({ phone, verificationId, code })
  }

  const error = verificationId === null ? sendCode.error : signIn.error
  const pending = sendCode.isPending || signIn.isPending

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-4 rounded-2xl bg-paper p-5 ring-1 ring-border"
      noValidate
    >
      <Field>
        <FieldLabel htmlFor="phone">მობილურის ნომერი</FieldLabel>
        <Input
          id="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="555 12 34 56"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={verificationId !== null}
        />
      </Field>
      {verificationId !== null ? (
        <Field>
          <FieldLabel htmlFor="code">SMS კოდი</FieldLabel>
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="h-14 text-center text-2xl tracking-[0.5em] tabular-nums"
          />
        </Field>
      ) : null}
      {error !== null ? <FieldError>{errorMessage(error)}</FieldError> : null}
      <Button type="submit" size="lg" disabled={pending || (verificationId !== null && code.length !== 6)}>
        {pending ? "იგზავნება…" : verificationId === null ? "კოდის მიღება" : "შესვლა"}
      </Button>
      {verificationId !== null ? (
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setVerificationId(null)
            setCode("")
          }}
        >
          ნომრის შეცვლა
        </Button>
      ) : null}
    </form>
  )
}
