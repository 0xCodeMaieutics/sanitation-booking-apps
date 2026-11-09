import { createHash, randomBytes, randomUUID } from "node:crypto"

import { createDb, eq, schema } from "./index"
import { SCENARIO_SERVICES, type Scenario, type ScenarioBooking, scenarios } from "./scenarios"

if (process.env.NODE_ENV === "production") {
  throw new Error("Refusing to seed with NODE_ENV=production")
}

const db = createDb()

type SeedCompany = {
  slug: string
  name: string
  adminPhones: { phone: string; alerts: boolean }[]
  services: { name: string; description: string; durationHours: number; priceGel: number }[]
}

/** Two Companies, so it is easy to see that neither one's data leaks into the other's. */
const companies: SeedCompany[] = [
  {
    slug: "aleko-tbilisi",
    name: "ალეკო",
    adminPhones: [
      { phone: "+995555123456", alerts: true },
      { phone: "+995555123457", alerts: false },
    ],
    services: [
      {
        name: "სეპტიკის გაწმენდა",
        description: "სეპტიკური ავზის ამოტუმბვა და გაწმენდა",
        durationHours: 2,
        priceGel: 200,
      },
      {
        name: "კანალიზაციის გაწმენდა",
        description: "ჩახერგილი მილის გახსნა და გარეცხვა",
        durationHours: 1,
        priceGel: 80,
      },
      {
        name: "მილების ვიდეოდიაგნოსტიკა",
        description: "კამერით შემოწმება და დასკვნა",
        durationHours: 1,
        priceGel: 120,
      },
    ],
  },
  {
    slug: "supta-qalaqi",
    name: "სუფთა ქალაქი",
    adminPhones: [{ phone: "+995555654321", alerts: true }],
    services: [
      {
        name: "საკანალიზაციო ჭის გაწმენდა",
        description: "ჭის ამოტუმბვა და გარეცხვა",
        durationHours: 3,
        priceGel: 250,
      },
      { name: "მილის გახსნა", description: "", durationHours: 1, priceGel: 70 },
    ],
  },
]

/** Creates the Company unless its slug exists; returns its id and whether it is new. */
async function seedCompany(c: SeedCompany): Promise<{ id: string; created: boolean }> {
  const [existing] = await db.select().from(schema.company).where(eq(schema.company.slug, c.slug))
  if (existing !== undefined) return { id: existing.id, created: false }
  return db.transaction(async (tx) => {
    const [row] = await tx.insert(schema.company).values({ slug: c.slug, name: c.name }).returning()
    if (row === undefined) throw new Error(`Failed to seed ${c.slug}`)
    await tx.insert(schema.companySlug).values({ slug: c.slug, companyId: row.id })
    await tx.insert(schema.adminPhone).values(c.adminPhones.map((p) => ({ ...p, companyId: row.id })))
    await tx.insert(schema.settings).values({ companyId: row.id })
    await tx
      .insert(schema.service)
      .values(c.services.map((svc, i) => ({ ...svc, sortOrder: i + 1, companyId: row.id })))
    return { id: row.id, created: true }
  })
}

const [aleko] = await Promise.all(companies.map(seedCompany))
if (aleko === undefined) throw new Error("No seed companies")

/** `hour` o'clock Tbilisi time, `daysAgo` days before today. Tbilisi is UTC+4 all year. */
function tbilisi(daysAgo: number, hour: number): Date {
  const today = new Date(Date.now() + 4 * 3_600_000)
  return new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - daysAgo, hour - 4)
  )
}

const addHours = (date: Date, hours: number) => new Date(date.getTime() + hours * 3_600_000)
const tokenHash = () => createHash("sha256").update(randomBytes(16)).digest("hex")

if (aleko.created) {
  const services = await db.select().from(schema.service).where(eq(schema.service.companyId, aleko.id))
  const byName = (name: string) => {
    const svc = services.find((s) => s.name === name)
    if (svc === undefined) throw new Error(`Seed service missing: ${name}`)
    return svc
  }
  const septic = byName("სეპტიკის გაწმენდა")
  const drain = byName("კანალიზაციის გაწმენდა")
  const camera = byName("მილების ვიდეოდიაგნოსტიკა")

  type Past = {
    service: typeof septic | { custom: string; durationHours: number }
    daysAgo: number
    hour: number
    priceGel: number | null
    clientName: string
    phone: string
    address: string
    note?: string
    createdBy: "client" | "admin"
  } & (
    | { status: "completed"; finishedAfterHours?: number }
    | { status: "cancelled"; cancelledBy: "client" | "admin" }
  )

  const bookings: Past[] = [
    {
      service: septic,
      daysAgo: 1,
      hour: 10,
      priceGel: 200,
      clientName: "ნინო ბერიძე",
      phone: "+995599112233",
      address: "საბურთალო, ვაჟა-ფშაველას 23",
      status: "completed",
      createdBy: "client",
    },
    {
      service: drain,
      daysAgo: 1,
      hour: 15,
      priceGel: 120,
      clientName: "დავით კაპანაძე",
      phone: "+995577445566",
      address: "ვაკე, აბაშიძის 8",
      note: "მეორე სართული",
      status: "completed",
      createdBy: "client",
    },
    {
      service: camera,
      daysAgo: 2,
      hour: 12,
      priceGel: 120,
      clientName: "თამარ ლომიძე",
      phone: "+995555778899",
      address: "დიდუბე, წერეთლის 115",
      status: "cancelled",
      cancelledBy: "client",
      createdBy: "client",
    },
    {
      service: septic,
      daysAgo: 3,
      hour: 9,
      priceGel: 300,
      clientName: "გიორგი მაისურაძე",
      phone: "+995591223344",
      address: "წყნეთი, მთავარი ქუჩა 4",
      note: "ავზი ძალიან სავსე იყო",
      status: "completed",
      createdBy: "client",
    },
    {
      service: { custom: "სარდაფის კანალიზაციის მილის შეცვლა", durationHours: 4 },
      daysAgo: 5,
      hour: 11,
      priceGel: 450,
      clientName: "ლევან ჩხეიძე",
      phone: "+995568334455",
      address: "ნაძალადევი, ცაბაძის 12",
      status: "completed",
      finishedAfterHours: 3,
      createdBy: "admin",
    },
    {
      service: drain,
      daysAgo: 6,
      hour: 17,
      priceGel: 80,
      clientName: "ეკა გელაშვილი",
      phone: "+995595667788",
      address: "გლდანი, ხიზანიშვილის 41",
      status: "cancelled",
      cancelledBy: "admin",
      createdBy: "client",
    },
    {
      service: camera,
      daysAgo: 8,
      hour: 14,
      priceGel: 150,
      clientName: "ზურაბ ნოზაძე",
      phone: "+995574889900",
      address: "ისანი, მორეტის 3",
      status: "completed",
      createdBy: "admin",
    },
    {
      service: drain,
      daysAgo: 10,
      hour: 10,
      priceGel: 80,
      clientName: "მარიამ ხუციშვილი",
      phone: "+995551990011",
      address: "მთაწმინდა, ლერმონტოვის 7",
      status: "completed",
      finishedAfterHours: 1,
      createdBy: "client",
    },
    {
      service: septic,
      daysAgo: 13,
      hour: 13,
      priceGel: 250,
      clientName: "ირაკლი წიკლაური",
      phone: "+995598001122",
      address: "დიღომი, ბერიტაშვილის 19",
      status: "completed",
      createdBy: "client",
    },
    {
      service: drain,
      daysAgo: 16,
      hour: 9,
      priceGel: null,
      clientName: "სოფო ჯაფარიძე",
      phone: "+995579112244",
      address: "ვარკეთილი, ჯავახეთის 56",
      status: "cancelled",
      cancelledBy: "client",
      createdBy: "client",
    },
    {
      service: camera,
      daysAgo: 20,
      hour: 16,
      priceGel: 120,
      clientName: "ნიკა ბაქრაძე",
      phone: "+995593556677",
      address: "ვაკე, ჭავჭავაძის 62",
      status: "completed",
      createdBy: "client",
    },
  ]

  await db.insert(schema.booking).values(
    bookings.map((b) => {
      const startsAt = tbilisi(b.daysAgo, b.hour)
      const durationHours = "custom" in b.service ? b.service.durationHours : b.service.durationHours
      return {
        companyId: aleko.id,
        serviceId: "custom" in b.service ? null : b.service.id,
        customService: "custom" in b.service ? b.service.custom : null,
        startsAt,
        durationHours,
        priceGel: b.priceGel,
        status: b.status,
        clientName: b.clientName,
        phone: b.phone,
        address: b.address,
        note: b.note ?? "",
        createdBy: b.createdBy,
        manageTokenHash: tokenHash(),
        endedAt:
          b.status === "completed"
            ? addHours(startsAt, b.finishedAfterHours ?? durationHours)
            : addHours(startsAt, -20),
        cancelledBy: b.status === "cancelled" ? b.cancelledBy : null,
        createdAt: addHours(startsAt, -48),
      }
    })
  )
  console.log(`Seeded ${bookings.length} past bookings.`)
}

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex")

const scenarioClients = [
  { clientName: "ნინო ბერიძე", phone: "+995599112233", address: "საბურთალო, ვაჟა-ფშაველას 23" },
  { clientName: "დავით კაპანაძე", phone: "+995577445566", address: "ვაკე, აბაშიძის 8" },
  { clientName: "თამარ ლომიძე", phone: "+995555778899", address: "დიდუბე, წერეთლის 115" },
  { clientName: "გიორგი მაისურაძე", phone: "+995591223344", address: "წყნეთი, მთავარი ქუჩა 4" },
  { clientName: "ეკა გელაშვილი", phone: "+995595667788", address: "გლდანი, ხიზანიშვილის 41" },
]

function scenarioClient(n: number) {
  const client = scenarioClients[n % scenarioClients.length]
  if (client === undefined) throw new Error("No scenario clients")
  return client
}

/** Deletes the scenario's Company if an earlier seed made it, then creates it for today. */
async function seedScenario(s: Scenario): Promise<void> {
  await db.transaction(async (tx) => {
    const [old] = await tx
      .select({ id: schema.company.id })
      .from(schema.company)
      .where(eq(schema.company.slug, s.slug))
    if (old !== undefined) {
      await tx.delete(schema.booking).where(eq(schema.booking.companyId, old.id))
      await tx.delete(schema.callbackRequest).where(eq(schema.callbackRequest.companyId, old.id))
      await tx.delete(schema.timeOff).where(eq(schema.timeOff.companyId, old.id))
      await tx.delete(schema.service).where(eq(schema.service.companyId, old.id))
      await tx.delete(schema.settings).where(eq(schema.settings.companyId, old.id))
      await tx.delete(schema.adminPhone).where(eq(schema.adminPhone.companyId, old.id))
      await tx.delete(schema.companySlug).where(eq(schema.companySlug.companyId, old.id))
      await tx.delete(schema.company).where(eq(schema.company.id, old.id))
    }

    const now = new Date()
    const [company] = await tx
      .insert(schema.company)
      .values({ slug: s.slug, name: s.name, suspendedAt: s.suspended === true ? now : null })
      .returning()
    if (company === undefined) throw new Error(`Failed to seed ${s.slug}`)
    const companyId = company.id
    await tx
      .insert(schema.companySlug)
      .values([s.slug, ...(s.formerSlugs ?? [])].map((slug) => ({ slug, companyId })))
    await tx.insert(schema.adminPhone).values({ companyId, phone: s.adminPhone })
    await tx
      .insert(schema.settings)
      .values({ companyId, minNoticeHours: s.minNoticeHours, workingDays: s.workingDays })
    const services = await tx
      .insert(schema.service)
      .values(
        (s.services ?? SCENARIO_SERVICES).map(({ archived, ...svc }, i) => ({
          ...svc,
          companyId,
          sortOrder: i + 1,
          archivedAt: archived === true ? now : null,
        }))
      )
      .returning()
    const serviceAt = (i: number) => {
      const svc = services[i]
      if (svc === undefined) throw new Error(`${s.slug} has no Service ${i}`)
      return svc
    }

    type Job = Pick<ScenarioBooking, "service" | "createdBy"> & {
      startsAt: Date
      priceGel?: number
      callbackRequestId?: string
    }
    /** `token` makes the Manage Link `/b/<token>`. */
    const bookingRow = (job: Job, n: number, token: string): typeof schema.booking.$inferInsert => {
      const row = {
        ...scenarioClient(n),
        companyId,
        startsAt: job.startsAt,
        createdBy: job.createdBy ?? "client",
        callbackRequestId: job.callbackRequestId ?? null,
        manageTokenHash: sha256(token),
        createdAt: addHours(job.startsAt, -48),
      }
      if (typeof job.service !== "number") {
        const { custom, durationHours } = job.service
        return {
          ...row,
          serviceId: null,
          customService: custom,
          durationHours,
          priceGel: job.priceGel ?? null,
        }
      }
      const svc = serviceAt(job.service)
      return {
        ...row,
        serviceId: svc.id,
        customService: null,
        durationHours: svc.durationHours,
        priceGel: svc.priceGel,
      }
    }
    const bookings = (s.bookings ?? []).map((b, i) =>
      bookingRow({ ...b, startsAt: tbilisi(-b.day, b.hour) }, i, `${s.slug}-${i + 1}`)
    )

    const requests = (s.callbackRequests ?? []).map((r, i) => ({
      ...r,
      id: randomUUID(),
      client: scenarioClient(i + 1),
      desiredStartsAt: r.desired === undefined ? null : tbilisi(-r.desired.day, r.desired.hour),
    }))
    if (requests.length > 0) {
      await tx.insert(schema.callbackRequest).values(
        requests.map((r) => ({
          id: r.id,
          companyId,
          ...r.client,
          address: r.desired === undefined ? "" : r.client.address,
          description: r.description ?? "",
          note: r.note ?? "",
          desiredStartsAt: r.desiredStartsAt,
          status: typeof r.status === "object" ? ("accepted" as const) : (r.status ?? "pending"),
          decidedAt: r.status === undefined || r.status === "pending" ? null : now,
          createdAt: addHours(now, -3),
        }))
      )
      const ticked = requests.flatMap((r) =>
        (r.services ?? []).map((i) => ({ callbackRequestId: r.id, serviceId: serviceAt(i).id }))
      )
      if (ticked.length > 0) await tx.insert(schema.callbackRequestService).values(ticked)
      for (const [i, r] of requests.entries()) {
        if (typeof r.status !== "object" || r.desiredStartsAt === null) continue
        const job: Job = {
          service: { custom: r.description ?? "", durationHours: r.status.acceptedHours },
          createdBy: "admin",
          startsAt: r.desiredStartsAt,
          priceGel: r.status.priceGel,
          callbackRequestId: r.id,
        }
        bookings.push(bookingRow(job, i + 1, `${s.slug}-r${i + 1}`))
      }
    }
    if (bookings.length > 0) await tx.insert(schema.booking).values(bookings)

    const offs = (s.timeOff ?? []).map((o) => ({
      companyId,
      startsAt: tbilisi(-o.day, o.fromHour ?? 0),
      endsAt: tbilisi(-o.day, o.toHour ?? 24),
      note: o.note ?? "",
    }))
    if (offs.length > 0) await tx.insert(schema.timeOff).values(offs)
  })
}

await Promise.all(scenarios.map(seedScenario))
console.log("Seeded test Companies (Admin Phone, Booking Link, situation):")
for (const s of scenarios) console.log(`  ${s.adminPhone}  /${s.slug}  ${s.purpose}`)

await db.$client.end()
console.log("Seeded.")
