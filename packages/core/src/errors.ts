export type DomainErrorCode =
  | "NOT_FOUND"
  | "INVALID_PHONE"
  | "INVALID_CODE"
  | "RATE_LIMITED"
  | "SMS_FAILED"
  | "NOT_ADMIN_PHONE"
  | "UNAUTHORIZED"
  | "START_UNAVAILABLE"
  | "DAY_PAUSED"
  | "PENDING_REQUEST_EXISTS"
  | "OVERLAP"
  | "INVALID_STATE"
  | "CANCEL_TOO_LATE"
  | "COMPANY_SUSPENDED"
  | "PHONE_TAKEN"
  | "LAST_ADMIN_PHONE"
  | "LAST_ALERT_PHONE"
  | "INVALID_SLUG"
  | "SLUG_TAKEN"
  | "INVALID_NAME"

export type Conflict = { kind: "booking" | "timeOff"; startsAt: Date; endsAt: Date; label: string }

/** An expected failure the user can act on, as opposed to a bug. */
export class DomainError extends Error {
  readonly code: DomainErrorCode
  readonly conflicts: Conflict[]

  constructor(code: DomainErrorCode, conflicts: Conflict[] = []) {
    super(code)
    this.name = "DomainError"
    this.code = code
    this.conflicts = conflicts
  }
}
