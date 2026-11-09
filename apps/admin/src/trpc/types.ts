import type { AdminRouter } from "@sanitation/api/admin"
import type { inferRouterOutputs } from "@trpc/server"

export type AdminOutputs = inferRouterOutputs<AdminRouter>
export type AdminBooking = AdminOutputs["bookings"]["byId"]
export type AdminService = AdminOutputs["services"]["list"][number]
export type AdminCallbackRequest = AdminOutputs["callbackRequests"]["byId"]
