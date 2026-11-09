"use client"

import { type UseMutationOptions, useMutation } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useTransition } from "react"

/**
 * A mutation that re-renders the current route's server components on success.
 * `isPending` stays true until the refreshed data has rendered.
 */
export function useRefreshingMutation<TData, TError, TVariables, TContext>(
  options: UseMutationOptions<TData, TError, TVariables, TContext>
) {
  const router = useRouter()
  const [isRefreshing, startRefresh] = useTransition()
  const mutation = useMutation({
    ...options,
    onSuccess: (...args) => {
      let result: unknown
      startRefresh(() => {
        router.refresh()
        result = options.onSuccess?.(...args)
      })
      return result
    },
  })
  return { ...mutation, isPending: mutation.isPending || isRefreshing }
}
