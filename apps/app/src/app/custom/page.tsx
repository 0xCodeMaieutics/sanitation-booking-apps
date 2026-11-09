import { serverCaller } from "@/server/caller"

import { CustomFlow } from "./custom-flow"

export default async function CustomRequestPage() {
  const caller = await serverCaller()
  const [services, days] = await Promise.all([caller.services(), caller.availability({ serviceId: null })])
  return <CustomFlow services={services} days={days} />
}
