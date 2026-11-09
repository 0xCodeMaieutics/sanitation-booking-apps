"use client"

import { Button } from "@sanitation/ui"
import { XIcon } from "lucide-react"
import { useState } from "react"

import { ConfirmDialog } from "@/components/confirm-dialog"
import { errorMessage } from "@/lib/errors"
import { useTRPC } from "@/trpc/client"
import { useRefreshingMutation } from "@/trpc/use-refreshing-mutation"

export function DeclineRequest({ callbackRequestId }: { callbackRequestId: string }) {
  const trpc = useTRPC()
  const [open, setOpen] = useState(false)
  const decline = useRefreshingMutation(
    trpc.callbackRequests.decline.mutationOptions({ onSuccess: () => setOpen(false) })
  )

  return (
    <>
      <Button type="button" variant="outline" size="lg" onClick={() => setOpen(true)}>
        <XIcon aria-hidden />
        უარყოფა
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="უარვყოთ მოთხოვნა?"
        description="კლიენტი მიიღებს SMS-ს, დღე კი ისევ გაიხსნება ჯავშნებისთვის."
        confirmLabel="დიახ, უარყოფა"
        destructive
        pending={decline.isPending}
        error={decline.error === null ? null : errorMessage(decline.error)}
        onConfirm={() => decline.mutate({ callbackRequestId })}
      />
    </>
  )
}
