"use client"

import { Button } from "@sanitation/ui"
import { AlertTriangleIcon } from "lucide-react"
import { useEffect } from "react"

export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => console.error(error), [error])

  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-4 rounded-2xl bg-paper px-6 py-10 text-center"
    >
      <AlertTriangleIcon aria-hidden className="size-10 text-danger" />
      <div className="flex flex-col gap-1">
        <h1 className="text-lg">რაღაც შეცდომა მოხდა</h1>
        <p className="text-ink-soft">გთხოვთ, სცადოთ თავიდან.</p>
      </div>
      <Button type="button" onClick={retry}>
        თავიდან ცდა
      </Button>
    </div>
  )
}
