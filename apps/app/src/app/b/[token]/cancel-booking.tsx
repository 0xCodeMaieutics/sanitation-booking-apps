"use client"

import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@sanitation/ui"
import { useState } from "react"

import { errorMessage } from "@/lib/errors"
import { useTRPC } from "@/trpc/client"
import { useRefreshingMutation } from "@/trpc/use-refreshing-mutation"

export function CancelBooking({ token }: { token: string }) {
  const trpc = useTRPC()
  const [open, setOpen] = useState(false)
  const cancel = useRefreshingMutation(trpc.cancel.mutationOptions({ onSuccess: () => setOpen(false) }))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="destructive" size="lg">
          ჯავშნის გაუქმება
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>გავაუქმოთ ჯავშანი?</DialogTitle>
          <DialogDescription>ეს დრო გათავისუფლდება სხვებისთვის. გაუქმებას ვერ დააბრუნებთ.</DialogDescription>
        </DialogHeader>
        {cancel.error !== null ? (
          <p role="alert" className="text-sm text-danger">
            {errorMessage(cancel.error)}
          </p>
        ) : null}
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              არა, დავტოვოთ
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            disabled={cancel.isPending}
            onClick={() => cancel.mutate({ token })}
          >
            {cancel.isPending ? "უქმდება…" : "დიახ, გაუქმება"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
