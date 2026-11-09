"use client"

import { Button } from "@sanitation/ui"
import { AlertTriangleIcon } from "lucide-react"
import { useEffect } from "react"

export default function DashboardError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => console.error(error), [error])

  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-4 rounded-2xl bg-paper px-6 py-10 text-center ring-1 ring-border"
    >
      <AlertTriangleIcon aria-hidden className="size-10 text-danger" />
      <div className="flex flex-col gap-1">
        <h1 className="text-lg">მონაცემები ვერ ჩაიტვირთა</h1>
        <p className="text-ink-soft">სცადეთ თავიდან.</p>
      </div>
      <Button type="button" onClick={retry}>
        თავიდან ცდა
      </Button>
    </div>
  )
}
