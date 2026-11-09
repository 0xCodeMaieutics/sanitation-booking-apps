import { PauseCircleIcon } from "lucide-react"
import type { Metadata } from "next"
import { notFound, permanentRedirect } from "next/navigation"

import { CompanyProvider } from "@/components/company"
import { Shell } from "@/components/shell"
import { findCompany } from "@/server/caller"

export async function generateMetadata({ params }: LayoutProps<"/[slug]">): Promise<Metadata> {
  const company = await findCompany((await params).slug)
  return company === null ? {} : { title: `${company.name} — ჯავშანი` }
}

/** A Company's Booking Link. A former slug moves the Client to the current one. */
export default async function CompanyLayout({ children, params }: LayoutProps<"/[slug]">) {
  const { slug } = await params
  const company = await findCompany(slug)
  if (company === null) notFound()
  if (company.slug !== slug) permanentRedirect(`/${company.slug}`)

  return (
    <Shell name={company.name} href={`/${company.slug}`}>
      {company.suspended ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-paper px-6 py-10 text-center ring-1 ring-border">
          <PauseCircleIcon aria-hidden className="size-10 text-warning" />
          <h1 className="text-xl">ჯავშანი დროებით მიუწვდომელია</h1>
          <p className="text-ink-soft">ონლაინ დაჯავშნა ამ ეტაპზე არ მუშაობს. სცადეთ მოგვიანებით.</p>
        </div>
      ) : (
        <CompanyProvider company={{ slug: company.slug, name: company.name }}>{children}</CompanyProvider>
      )}
    </Shell>
  )
}
