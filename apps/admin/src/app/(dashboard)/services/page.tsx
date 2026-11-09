import { PageHeader } from "@/components/page-header"
import { requireAdmin } from "@/server/caller"

import { ServiceEditor } from "./service-editor"

export default async function ServicesPage() {
  const caller = await requireAdmin()
  const services = await caller.services.list()
  const active = services.filter((s) => s.archivedAt === null)
  const archived = services.filter((s) => s.archivedAt !== null)

  return (
    <>
      <PageHeader
        title="სერვისები"
        description="ხანგრძლივობა განსაზღვრავს, რამდენ ხანს იკავებს ჯავშანი. ფასს კლიენტი ხედავს."
        action={<ServiceEditor service={null} />}
      />
      <div className="flex flex-col gap-2">
        {active.length === 0 ? (
          <p className="rounded-2xl bg-paper px-4 py-8 text-center text-ink-soft ring-1 ring-border">
            სერვისები ჯერ არ არის. დაამატეთ პირველი.
          </p>
        ) : (
          active.map((s) => <ServiceEditor key={s.id} service={s} />)
        )}
      </div>
      {archived.length > 0 ? (
        <section className="mt-8 flex flex-col gap-2" aria-labelledby="archived">
          <h2 id="archived" className="text-sm font-semibold text-ink-soft">
            დაარქივებული
          </h2>
          {archived.map((s) => (
            <ServiceEditor key={s.id} service={s} />
          ))}
        </section>
      ) : null}
    </>
  )
}
