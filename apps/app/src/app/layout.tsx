import "./globals.css"
import { Logo } from "@sanitation/ui"
import type { Metadata, Viewport } from "next"
import { Noto_Sans_Georgian } from "next/font/google"
import Link from "next/link"
import type { ReactNode } from "react"

import { BUSINESS_NAME } from "@/lib/format"
import { Providers } from "@/trpc/client"

const sans = Noto_Sans_Georgian({ subsets: ["georgian", "latin"], variable: "--font-noto-sans" })

export const metadata: Metadata = {
  title: `${BUSINESS_NAME} — ჯავშანი`,
  description: "დაჯავშნეთ სანიტარიული მომსახურება ონლაინ",
}

export const viewport: Viewport = {
  themeColor: "#1e40af",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ka" className={sans.variable}>
      <body className="min-h-dvh">
        <Providers>
          <header className="sticky top-0 z-20 border-b border-border bg-paper/95 pt-[env(safe-area-inset-top)] backdrop-blur">
            <div className="mx-auto flex h-14 max-w-lg items-center gap-2.5 px-4">
              <Link href="/" className="flex items-center gap-2.5 rounded-lg font-semibold text-ink">
                <Logo />
                {BUSINESS_NAME}
              </Link>
            </div>
          </header>
          <main className="mx-auto w-full max-w-lg px-4 pt-5 pb-[calc(6rem+env(safe-area-inset-bottom))]">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  )
}
