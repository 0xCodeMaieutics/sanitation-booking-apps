"use client"

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Field,
  FieldError,
  FieldLabel,
  Input,
  NativeSelect,
  NativeSelectOption,
  Textarea,
  cn,
} from "@sanitation/ui"
import { ArchiveIcon, ArchiveRestoreIcon, PencilIcon, PlusIcon } from "lucide-react"
import { type FormEvent, useState } from "react"

import { errorMessage } from "@/lib/errors"
import { formatDuration, formatPrice } from "@/lib/format"
import { useTRPC } from "@/trpc/client"
import type { AdminService } from "@/trpc/types"
import { useRefreshingMutation } from "@/trpc/use-refreshing-mutation"

/** A Service row with edit and archive controls, or the "add" button when `service` is null. */
export function ServiceEditor({ service }: { service: AdminService | null }) {
  const trpc = useTRPC()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(service?.name ?? "")
  const [description, setDescription] = useState(service?.description ?? "")
  const [duration, setDuration] = useState(String(service?.durationHours ?? 1))
  const [price, setPrice] = useState(service === null ? "" : String(service.priceGel))
  const close = () => setOpen(false)
  const create = useRefreshingMutation(
    trpc.services.create.mutationOptions({
      onSuccess: () => {
        close()
        setName("")
        setDescription("")
        setDuration("1")
        setPrice("")
      },
    })
  )
  const update = useRefreshingMutation(trpc.services.update.mutationOptions({ onSuccess: close }))
  const archive = useRefreshingMutation(trpc.services.setArchived.mutationOptions())
  const save = service === null ? create : update
  const archived = service !== null && service.archivedAt !== null

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const input = { name, description, durationHours: Number(duration), priceGel: Number(price) }
    if (service === null) create.mutate(input)
    else update.mutate({ ...input, serviceId: service.id })
  }

  return (
    <>
      {service === null ? (
        <Button type="button" onClick={() => setOpen(true)}>
          <PlusIcon aria-hidden />
          დამატება
        </Button>
      ) : (
        <div
          className={cn(
            "flex items-center gap-3 rounded-2xl bg-paper p-4 ring-1 ring-border",
            archived && "opacity-70"
          )}
        >
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="font-semibold">{service.name}</span>
            {service.description !== "" ? (
              <span className="line-clamp-2 text-sm text-ink-soft">{service.description}</span>
            ) : null}
            <span className="text-sm">
              {formatDuration(service.durationHours)} · {formatPrice(service.priceGel)}
            </span>
          </div>
          {archived ? null : (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="რედაქტირება"
              onClick={() => setOpen(true)}
            >
              <PencilIcon aria-hidden />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={archived ? "აღდგენა" : "დაარქივება"}
            title={archived ? "აღდგენა" : "დაარქივება"}
            disabled={archive.isPending}
            onClick={() => archive.mutate({ serviceId: service.id, archived: !archived })}
          >
            {archived ? <ArchiveRestoreIcon aria-hidden /> : <ArchiveIcon aria-hidden />}
          </Button>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{service === null ? "ახალი სერვისი" : "სერვისის რედაქტირება"}</DialogTitle>
            <DialogDescription>არსებულ ჯავშნებზე ცვლილება არ აისახება.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
            <Field>
              <FieldLabel htmlFor={`name-${service?.id ?? "new"}`}>დასახელება</FieldLabel>
              <Input
                id={`name-${service?.id ?? "new"}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={120}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`description-${service?.id ?? "new"}`}>
                აღწერა <span className="font-normal text-ink-soft">(არასავალდებულო)</span>
              </FieldLabel>
              <Textarea
                id={`description-${service?.id ?? "new"}`}
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={300}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor={`duration-${service?.id ?? "new"}`}>ხანგრძლივობა</FieldLabel>
                <NativeSelect
                  id={`duration-${service?.id ?? "new"}`}
                  className="w-full"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <NativeSelectOption key={i + 1} value={String(i + 1)}>
                      {formatDuration(i + 1)}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor={`price-${service?.id ?? "new"}`}>საწყისი ფასი (₾)</FieldLabel>
                <Input
                  id={`price-${service?.id ?? "new"}`}
                  inputMode="numeric"
                  value={price}
                  onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))}
                />
              </Field>
            </div>
            {save.error !== null ? <FieldError>{errorMessage(save.error)}</FieldError> : null}
            <Button
              type="submit"
              size="lg"
              disabled={save.isPending || name.trim().length < 2 || price === ""}
            >
              {save.isPending ? "ინახება…" : "შენახვა"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
