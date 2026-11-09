"use client"

import { type IsoWeekday, WEEKDAYS } from "@sanitation/core/time"
import {
  Button,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  NativeSelect,
  NativeSelectOption,
  cn,
} from "@sanitation/ui"
import { CheckIcon } from "lucide-react"
import { type FormEvent, useState } from "react"

import { errorMessage } from "@/lib/errors"
import { useTRPC } from "@/trpc/client"
import { useRefreshingMutation } from "@/trpc/use-refreshing-mutation"

const DAYS: IsoWeekday[] = [1, 2, 3, 4, 5, 6, 7]
const NOTICE_OPTIONS = [0, 1, 2, 3, 4, 6, 8, 12, 24, 48, 72]

export function SettingsForm(props: { minNoticeHours: number; workingDays: IsoWeekday[] }) {
  const trpc = useTRPC()
  const [minNoticeHours, setMinNoticeHours] = useState(props.minNoticeHours)
  const [workingDays, setWorkingDays] = useState(new Set(props.workingDays))
  const [saved, setSaved] = useState(false)
  const save = useRefreshingMutation(
    trpc.settings.update.mutationOptions({ onSuccess: () => setSaved(true) })
  )
  const notice = NOTICE_OPTIONS.includes(minNoticeHours)
    ? NOTICE_OPTIONS
    : [...NOTICE_OPTIONS, minNoticeHours].toSorted((a, b) => a - b)

  const toggle = (day: IsoWeekday) => {
    const next = new Set(workingDays)
    if (next.has(day)) next.delete(day)
    else next.add(day)
    setWorkingDays(next)
    setSaved(false)
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    save.mutate({ minNoticeHours, workingDays: DAYS.filter((d) => workingDays.has(d)) })
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-5 rounded-2xl bg-paper p-4 ring-1 ring-border"
      noValidate
    >
      <Field>
        <FieldLabel htmlFor="minNotice">მინიმალური წინასწარი დრო (საათი)</FieldLabel>
        <NativeSelect
          id="minNotice"
          className="w-full"
          value={minNoticeHours}
          onChange={(e) => {
            setMinNoticeHours(Number(e.target.value))
            setSaved(false)
          }}
          aria-describedby="minNotice-help"
        >
          {notice.map((h) => (
            <NativeSelectOption key={h} value={h}>
              {h === 0 ? "0 — დღესვე, ნებისმიერ დროს" : `${h} სთ`}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <FieldDescription id="minNotice-help">რამდენი საათით ადრე უნდა დაჯავშნოს კლიენტმა.</FieldDescription>
      </Field>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">სამუშაო დღეები</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {DAYS.map((day) => {
            const on = workingDays.has(day)
            return (
              <label
                key={day}
                className={cn(
                  "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 ring-1 transition-colors duration-150 has-focus-visible:ring-2 has-focus-visible:ring-ring",
                  on ? "bg-mist ring-brand-soft" : "ring-border"
                )}
              >
                <input type="checkbox" className="sr-only" checked={on} onChange={() => toggle(day)} />
                <span
                  aria-hidden
                  className={cn(
                    "flex size-5 items-center justify-center rounded-md ring-1",
                    on ? "bg-brand text-white ring-brand" : "ring-border"
                  )}
                >
                  {on ? <CheckIcon className="size-3.5" /> : null}
                </span>
                {WEEKDAYS[day]}
              </label>
            )
          })}
        </div>
      </fieldset>

      {workingDays.size === 0 ? <FieldError>აირჩიეთ ერთი დღე მაინც.</FieldError> : null}
      {save.error !== null ? <FieldError>{errorMessage(save.error)}</FieldError> : null}

      <Button type="submit" size="lg" disabled={save.isPending || workingDays.size === 0}>
        {save.isPending ? "ინახება…" : saved ? "შენახულია" : "შენახვა"}
      </Button>
    </form>
  )
}
