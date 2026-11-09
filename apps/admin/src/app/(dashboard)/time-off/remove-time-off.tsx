"use client"

import { Button } from "@sanitation/ui"
import { Trash2Icon } from "lucide-react"

import { useTRPC } from "@/trpc/client"
import { useRefreshingMutation } from "@/trpc/use-refreshing-mutation"

export function RemoveTimeOff({ timeOffId }: { timeOffId: string }) {
  const trpc = useTRPC()
  const remove = useRefreshingMutation(trpc.timeOff.remove.mutationOptions())
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="წაშლა"
      disabled={remove.isPending}
      onClick={() => remove.mutate({ timeOffId })}
    >
      <Trash2Icon aria-hidden className="text-danger" />
    </Button>
  )
}
