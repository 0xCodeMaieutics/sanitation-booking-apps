"use client"

import { Button } from "@sanitation/ui"
import { LogOutIcon } from "lucide-react"
import { useRouter } from "next/navigation"

import { useTRPC } from "@/trpc/client"
import { useRefreshingMutation } from "@/trpc/use-refreshing-mutation"

export function SignOut() {
  const trpc = useTRPC()
  const router = useRouter()
  const signOut = useRefreshingMutation(
    trpc.auth.signOut.mutationOptions({ onSuccess: () => router.replace("/sign-in") })
  )
  return (
    <Button
      type="button"
      variant="ghost"
      className="mt-6 w-full text-danger"
      disabled={signOut.isPending}
      onClick={() => signOut.mutate()}
    >
      <LogOutIcon aria-hidden />
      ამ მოწყობილობიდან გასვლა
    </Button>
  )
}
