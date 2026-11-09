import { serverCaller } from "@/server/caller"

import { CustomFlow } from "./custom-flow"

export default async function CustomRequestPage({ params }: PageProps<"/[slug]/custom">) {
  const { slug } = await params
  const caller = await serverCaller()
  const [services, days] = await Promise.all([
    caller.services({ slug }),
    caller.availability({ slug, serviceId: null }),
  ])
  return <CustomFlow services={services} days={days} />
}
