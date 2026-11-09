// Cleanly's own operations on Companies. Run from the repo root, e.g.
//   pnpm company create --slug aleko-tbilisi --name "ალეკო" --phone 555123456
// Against production, set DATABASE_URL (and APP_URL, to print Booking Links) in the environment.
import { parseArgs } from "node:util"

import { createDb } from "@sanitation/db"

import {
  type Company,
  DomainError,
  addAdminPhone,
  bookingLink,
  changeCompanySlug,
  createCompany,
  findCompanyBySlug,
  listCompanies,
  renameCompany,
  setCompanySuspended,
} from "../src"

const USAGE = `Usage: pnpm company <command> [options]

  list
  create    --slug <slug> --name <Company Name> --phone <first Admin Phone>
  rename    --slug <slug> --name <Company Name>
  set-slug  --slug <slug> --new-slug <slug>     the old slug keeps leading to the Company
  suspend   --slug <slug>
  restore   --slug <slug>
  add-phone --slug <slug> --phone <Admin Phone>  e.g. when a Company has locked itself out`

const ERRORS: Partial<Record<DomainError["code"], string>> = {
  NOT_FOUND: "No Company has that slug.",
  INVALID_SLUG: "Slugs are 3–40 lowercase Latin letters, digits and single hyphens, and not a reserved word.",
  SLUG_TAKEN: "That slug belongs, or once belonged, to another Company.",
  INVALID_NAME: "The Company Name must be 2–40 characters.",
  INVALID_PHONE: "Expected a Georgian mobile number, e.g. 555123456.",
  PHONE_TAKEN: "That number is already an Admin Phone of a Company.",
}

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    slug: { type: "string" },
    "new-slug": { type: "string" },
    name: { type: "string" },
    phone: { type: "string" },
  },
})

function required(name: keyof typeof values): string {
  const value = values[name]
  if (value === undefined || value === "") {
    console.error(`Missing --${name}.\n\n${USAGE}`)
    process.exit(1)
  }
  return value
}

function describe(c: Company): string {
  const appUrl = process.env.APP_URL ?? ""
  const link = appUrl === "" ? c.slug : bookingLink(appUrl, c.slug)
  return `${c.name}  ${link}${c.suspendedAt !== null ? "  (Suspended)" : ""}`
}

const db = createDb()
try {
  const now = new Date()
  switch (positionals[0]) {
    case "list":
      for (const c of await listCompanies(db)) console.log(describe(c))
      break
    case "create":
      console.log(
        `Created ${describe(
          await createCompany(db, {
            slug: required("slug"),
            name: required("name"),
            adminPhone: required("phone"),
          })
        )}`
      )
      break
    case "rename":
      console.log(
        `Renamed: ${describe(await renameCompany(db, { slug: required("slug"), name: required("name") }))}`
      )
      break
    case "set-slug":
      console.log(
        `Moved: ${describe(await changeCompanySlug(db, { slug: required("slug"), newSlug: required("new-slug") }))}`
      )
      break
    case "suspend":
    case "restore":
      console.log(
        describe(
          await setCompanySuspended(db, {
            slug: required("slug"),
            suspended: positionals[0] === "suspend",
            now,
          })
        )
      )
      break
    case "add-phone": {
      const c = await findCompanyBySlug(db, required("slug"))
      if (c === null) throw new DomainError("NOT_FOUND")
      await addAdminPhone(db, { companyId: c.id, phone: required("phone"), alerts: true })
      console.log(`Added an Admin Phone, with alerts on, to ${describe(c)}`)
      break
    }
    default:
      console.error(USAGE)
      process.exitCode = 1
  }
} catch (error) {
  if (!(error instanceof DomainError)) throw error
  console.error(ERRORS[error.code] ?? error.code)
  process.exitCode = 1
} finally {
  await db.$client.end()
}
