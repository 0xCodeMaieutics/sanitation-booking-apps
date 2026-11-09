import { type Db, type DbOrTx, asc, eq, isUniqueViolation, schema } from "@sanitation/db"

import { DomainError } from "./errors"
import { normalizePhone } from "./phone"

const { adminPhone, company, companySlug, settings } = schema

/** Top-level paths of the Client app that a slug would shadow. */
const RESERVED_SLUGS = new Set(["admin", "api", "app", "b", "cleanly", "help", "login", "sign-in", "www"])

/** Lowercase Latin letters, digits and single hyphens, 3–40 characters, e.g. `aleko-tbilisi`. */
export function isValidSlug(slug: string): boolean {
  return (
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) &&
    slug.length >= 3 &&
    slug.length <= 40 &&
    !RESERVED_SLUGS.has(slug)
  )
}

export function bookingLink(appUrl: string, slug: string): string {
  return `${appUrl.replace(/\/$/, "")}/${slug}`
}

export type Company = typeof company.$inferSelect

/** The Company a current or former slug leads to. */
export async function findCompanyBySlug(db: DbOrTx, slug: string): Promise<Company | null> {
  const [row] = await db
    .select({ company })
    .from(companySlug)
    .innerJoin(company, eq(company.id, companySlug.companyId))
    .where(eq(companySlug.slug, slug))
  return row?.company ?? null
}

export async function getCompany(db: DbOrTx, companyId: string): Promise<Company> {
  const [row] = await db.select().from(company).where(eq(company.id, companyId))
  if (row === undefined) throw new DomainError("NOT_FOUND")
  return row
}

/** The Company, refusing new work while it is Suspended. */
export async function getActiveCompany(db: DbOrTx, companyId: string): Promise<Company> {
  const c = await getCompany(db, companyId)
  if (c.suspendedAt !== null) throw new DomainError("COMPANY_SUSPENDED")
  return c
}

function checkName(name: string): string {
  const trimmed = name.trim()
  if (trimmed.length < 2 || trimmed.length > 40) throw new DomainError("INVALID_NAME")
  return trimmed
}

// Cleanly's own operations, run from the `company` script.

export async function listCompanies(db: DbOrTx) {
  return db.select().from(company).orderBy(asc(company.createdAt))
}

/** Onboards a Company with its first Admin Phone, which gets Admin Alerts. */
export async function createCompany(
  db: Db,
  input: { slug: string; name: string; adminPhone: string }
): Promise<Company> {
  if (!isValidSlug(input.slug)) throw new DomainError("INVALID_SLUG")
  const name = checkName(input.name)
  const phone = normalizePhone(input.adminPhone)
  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx.insert(company).values({ slug: input.slug, name }).returning()
      if (row === undefined) throw new Error("Failed to create company")
      await tx.insert(companySlug).values({ slug: input.slug, companyId: row.id })
      await tx.insert(adminPhone).values({ companyId: row.id, phone })
      await tx.insert(settings).values({ companyId: row.id })
      return row
    })
  } catch (error) {
    if (isUniqueViolation(error, "company_slug_pkey") || isUniqueViolation(error, "company_slug_unique")) {
      throw new DomainError("SLUG_TAKEN")
    }
    if (isUniqueViolation(error, "admin_phone_phone_unique")) throw new DomainError("PHONE_TAKEN")
    throw error
  }
}

/** Gives a Company a new slug. The old one keeps leading to it, so it may also be taken back. */
export async function changeCompanySlug(db: Db, input: { slug: string; newSlug: string }): Promise<Company> {
  if (!isValidSlug(input.newSlug)) throw new DomainError("INVALID_SLUG")
  return db.transaction(async (tx) => {
    const c = await findCompanyBySlug(tx, input.slug)
    if (c === null) throw new DomainError("NOT_FOUND")
    const owner = await findCompanyBySlug(tx, input.newSlug)
    if (owner !== null && owner.id !== c.id) throw new DomainError("SLUG_TAKEN")
    if (owner === null) await tx.insert(companySlug).values({ slug: input.newSlug, companyId: c.id })
    const [row] = await tx
      .update(company)
      .set({ slug: input.newSlug })
      .where(eq(company.id, c.id))
      .returning()
    if (row === undefined) throw new Error("Failed to change slug")
    return row
  })
}

export async function renameCompany(db: DbOrTx, input: { slug: string; name: string }): Promise<Company> {
  const name = checkName(input.name)
  const c = await findCompanyBySlug(db, input.slug)
  if (c === null) throw new DomainError("NOT_FOUND")
  const [row] = await db.update(company).set({ name }).where(eq(company.id, c.id)).returning()
  if (row === undefined) throw new Error("Failed to rename company")
  return row
}

export async function setCompanySuspended(
  db: DbOrTx,
  input: { slug: string; suspended: boolean; now: Date }
): Promise<Company> {
  const c = await findCompanyBySlug(db, input.slug)
  if (c === null) throw new DomainError("NOT_FOUND")
  const [row] = await db
    .update(company)
    .set({ suspendedAt: input.suspended ? (c.suspendedAt ?? input.now) : null })
    .where(eq(company.id, c.id))
    .returning()
  if (row === undefined) throw new Error("Failed to update company")
  return row
}
