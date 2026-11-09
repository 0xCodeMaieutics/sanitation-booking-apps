import type { AppRouter } from "@sanitation/api/app"
import type { inferRouterOutputs } from "@trpc/server"

export type AppOutputs = inferRouterOutputs<AppRouter>
export type Availability = AppOutputs["availability"]
export type DayAvailability = Availability[number]
export type ServiceSummary = AppOutputs["services"][number]
