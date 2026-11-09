"use client"

import { formatPhone, normalizePhone } from "@sanitation/core/phone"
import { Button, Field, FieldDescription, FieldError, FieldLabel, Input } from "@sanitation/ui"
import { useMutation } from "@tanstack/react-query"
import { MessageSquareIcon } from "lucide-react"
import { type FormEvent, useEffect, useState } from "react"

import { errorMessage } from "@/lib/errors"
import { useTRPC } from "@/trpc/client"

import { BottomBar } from "./bottom-bar"

const RESEND_SECONDS = 60

/** The resend countdown; it starts on mount, since a code was just sent. */
function useCountdown(): [number, () => void] {
  const [left, setLeft] = useState(RESEND_SECONDS)
  useEffect(() => {
    if (left <= 0) return undefined
    const id = setTimeout(() => setLeft((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [left])
  return [left, () => setLeft(RESEND_SECONDS)]
}

/** Sends the Verification Code; returns its id once sent. */
export function useSendCode() {
  const trpc = useTRPC()
  return useMutation(trpc.sendCode.mutationOptions())
}

/** The SMS code step: the Client types the code, and `onSubmit` makes the Booking or request. */
export function CodeStep({
  phone,
  onResent,
  onSubmit,
  isSubmitting,
  submitError,
  submitLabel,
}: {
  phone: string
  onResent: (verificationId: string) => void
  onSubmit: (code: string) => void
  isSubmitting: boolean
  submitError: unknown
  submitLabel: string
}) {
  const [code, setCode] = useState("")
  const [secondsLeft, restart] = useCountdown()
  const sendCode = useSendCode()
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (code.trim().length === 6) onSubmit(code.trim())
  }

  let shownPhone = phone
  try {
    shownPhone = formatPhone(normalizePhone(phone))
  } catch {}

  const error = submitError ?? sendCode.error

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <div className="flex items-start gap-3 rounded-2xl bg-mist p-4">
        <MessageSquareIcon aria-hidden className="mt-0.5 size-5 shrink-0 text-brand" />
        <p>
          კოდი გაიგზავნა ნომერზე <span className="font-semibold whitespace-nowrap">{shownPhone}</span>
        </p>
      </div>

      <Field data-invalid={error !== null && error !== undefined}>
        <FieldLabel htmlFor="code">SMS კოდი</FieldLabel>
        <Input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className="h-14 text-center text-2xl tracking-[0.5em] tabular-nums"
          aria-invalid={error !== null && error !== undefined}
          aria-describedby="code-help"
        />
        {error !== null && error !== undefined ? (
          <FieldError>{errorMessage(error)}</FieldError>
        ) : (
          <FieldDescription id="code-help">6-ციფრიანი კოდი მოქმედებს 10 წუთი.</FieldDescription>
        )}
      </Field>

      <Button
        type="button"
        variant="ghost"
        className="self-start"
        disabled={secondsLeft > 0 || sendCode.isPending}
        onClick={() =>
          sendCode.mutate(
            { phone },
            {
              onSuccess: (r) => {
                setCode("")
                restart()
                onResent(r.verificationId)
              },
            }
          )
        }
      >
        {secondsLeft > 0 ? `ხელახლა გაგზავნა ${secondsLeft} წამში` : "კოდის ხელახლა გაგზავნა"}
      </Button>

      <BottomBar>
        <Button
          type="submit"
          variant="cta"
          size="lg"
          className="w-full"
          disabled={code.length !== 6 || isSubmitting}
        >
          {isSubmitting ? "იგზავნება…" : submitLabel}
        </Button>
      </BottomBar>
    </form>
  )
}
