"use client"

import { Button } from "@sanitation/ui"
import { CheckIcon, XIcon } from "lucide-react"
import { useState } from "react"

import { ConfirmDialog } from "@/components/confirm-dialog"
import { errorMessage } from "@/lib/errors"
import { useTRPC } from "@/trpc/client"
import { useRefreshingMutation } from "@/trpc/use-refreshing-mutation"

export function BookingActions({ bookingId }: { bookingId: string }) {
  const trpc = useTRPC()
  const [dialog, setDialog] = useState<"complete" | "cancel" | null>(null)
  const close = () => setDialog(null)
  const complete = useRefreshingMutation(trpc.bookings.complete.mutationOptions({ onSuccess: close }))
  const cancel = useRefreshingMutation(trpc.bookings.cancel.mutationOptions({ onSuccess: close }))

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <Button type="button" size="lg" onClick={() => setDialog("complete")}>
        <CheckIcon aria-hidden />
        შესრულებულია
      </Button>
      <Button type="button" size="lg" variant="destructive" onClick={() => setDialog("cancel")}>
        <XIcon aria-hidden />
        გაუქმება
      </Button>

      <ConfirmDialog
        open={dialog === "complete"}
        onOpenChange={(open) => !open && close()}
        title="სამუშაო დასრულდა?"
        description="ამ მომენტიდან დარჩენილი დრო გათავისუფლდება ახალი ჯავშნებისთვის."
        confirmLabel="დიახ, შესრულდა"
        pending={complete.isPending}
        error={complete.error === null ? null : errorMessage(complete.error)}
        onConfirm={() => complete.mutate({ bookingId })}
      />
      <ConfirmDialog
        open={dialog === "cancel"}
        onOpenChange={(open) => !open && close()}
        title="გავაუქმოთ ჯავშანი?"
        description="კლიენტი მიიღებს SMS-ს გაუქმების შესახებ, დრო კი გათავისუფლდება."
        confirmLabel="დიახ, გაუქმება"
        destructive
        pending={cancel.isPending}
        error={cancel.error === null ? null : errorMessage(cancel.error)}
        onConfirm={() => cancel.mutate({ bookingId })}
      />
    </div>
  )
}
