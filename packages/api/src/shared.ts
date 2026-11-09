import { type Conflict, DomainError, type DomainErrorCode, isLocalDate } from "@sanitation/core"
import { TRPCError, type TRPC_ERROR_CODE_KEY } from "@trpc/server"
import superjson from "superjson"
import { z } from "zod"

const trpcCodeFor: Record<DomainErrorCode, TRPC_ERROR_CODE_KEY> = {
  NOT_FOUND: "NOT_FOUND",
  INVALID_PHONE: "BAD_REQUEST",
  INVALID_CODE: "BAD_REQUEST",
  RATE_LIMITED: "TOO_MANY_REQUESTS",
  SMS_FAILED: "SERVICE_UNAVAILABLE",
  NOT_ADMIN_PHONE: "FORBIDDEN",
  UNAUTHORIZED: "UNAUTHORIZED",
  START_UNAVAILABLE: "CONFLICT",
  DAY_PAUSED: "CONFLICT",
  PENDING_REQUEST_EXISTS: "CONFLICT",
  OVERLAP: "CONFLICT",
  INVALID_STATE: "CONFLICT",
  CANCEL_TOO_LATE: "FORBIDDEN",
  COMPANY_SUSPENDED: "FORBIDDEN",
  PHONE_TAKEN: "CONFLICT",
  LAST_ADMIN_PHONE: "CONFLICT",
  LAST_ALERT_PHONE: "CONFLICT",
  INVALID_SLUG: "BAD_REQUEST",
  SLUG_TAKEN: "CONFLICT",
  INVALID_NAME: "BAD_REQUEST",
}

export type DomainErrorData = { domainCode: DomainErrorCode | null; conflicts: Conflict[] }

/** Shared tRPC options: superjson for Dates, and the domain error code and conflicts on errors. */
export const trpcOptions = {
  transformer: superjson,
  errorFormatter({ shape, error }: { shape: { data: object }; error: TRPCError }) {
    const cause = error.cause instanceof DomainError ? error.cause : null
    const data: DomainErrorData = { domainCode: cause?.code ?? null, conflicts: cause?.conflicts ?? [] }
    return { ...shape, data: { ...shape.data, ...data } }
  },
}

/** Rethrows a domain error as a tRPC error with a matching HTTP status. */
export function rethrowDomainError(error: TRPCError): void {
  const cause = error.cause
  if (cause instanceof DomainError) {
    throw new TRPCError({ code: trpcCodeFor[cause.code], message: cause.message, cause })
  }
}

export const zLocalDate = z.string().refine(isLocalDate, "Expected YYYY-MM-DD")
export const zPhone = z.string().trim().min(9).max(20)
export const zCode = z.string().trim().min(4).max(10)
export const zName = z.string().trim().min(2).max(120)
export const zAddress = z.string().trim().min(3).max(300)
export const zNote = z.string().trim().max(1000)
export const zHours = z.number().int().min(1).max(12)
export const zPrice = z.number().int().min(0).max(1_000_000)
