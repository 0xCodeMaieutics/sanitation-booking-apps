import { Button } from "@sanitation/ui"
import Link from "next/link"

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-lg">ვერ მოიძებნა</h1>
      <Button asChild>
        <Link href="/">ჯავშნებზე დაბრუნება</Link>
      </Button>
    </main>
  )
}
