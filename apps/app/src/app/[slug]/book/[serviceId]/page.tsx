import { notFound } from "next/navigation"

import { findOrNull, serverCaller } from "@/server/caller"

import { BookingFlow } from "./booking-flow"

export default async function BookServicePage({ params }: PageProps<"/[slug]/book/[serviceId]">) {
  const { slug, serviceId } = await params
  if (!/^[0-9a-f-]{36}$/.test(serviceId)) notFound()
  const caller = await serverCaller()
  const [services, days] = await Promise.all([
    caller.services({ slug }),
    findOrNull(caller.availability({ slug, serviceId })),
  ])
  const service = services.find((s) => s.id === serviceId)
  if (service === undefined || days === null) notFound()

  return <BookingFlow service={service} services={services} days={days} />
}
