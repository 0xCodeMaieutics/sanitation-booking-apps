import "./globals.css"
import type { Metadata, Viewport } from "next"
import { Noto_Sans_Georgian } from "next/font/google"
import type { ReactNode } from "react"

import { Providers } from "@/trpc/client"

const sans = Noto_Sans_Georgian({ subsets: ["georgian", "latin"], variable: "--font-noto-sans" })

export const metadata: Metadata = {
  title: "Cleanly — ჯავშანი",
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
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
