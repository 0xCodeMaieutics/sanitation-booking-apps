import { createHash, randomBytes } from "node:crypto"

import { createDb, lt, schema } from "./index"

const db = createDb()

const existing = await db.select({ id: schema.service.id }).from(schema.service).limit(1)
if (existing.length === 0) {
  await db.insert(schema.service).values([
    {
      name: "სეპტიკის გაწმენდა",
      description: "სეპტიკური ავზის ამოტუმბვა და გაწმენდა",
      durationHours: 2,
      priceGel: 200,
      sortOrder: 1,
    },
    {
      name: "კანალიზაციის გაწმენდა",
      description: "ჩახერგილი მილის გახსნა და გარეცხვა",
      durationHours: 1,
      priceGel: 80,
      sortOrder: 2,
    },
    {
      name: "მილების ვიდეოდიაგნოსტიკა",
      description: "კამერით შემოწმება და დასკვნა",
      durationHours: 1,
      priceGel: 120,
      sortOrder: 3,
    },
  ])
}
await db.insert(schema.settings).values({ id: 1 }).onConflictDoNothing()

/** `hour` o'clock Tbilisi time, `daysAgo` days before today. Tbilisi is UTC+4 all year. */
function tbilisi(daysAgo: number, hour: number): Date {
  const today = new Date(Date.now() + 4 * 3_600_000)
  return new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - daysAgo, hour - 4)
  )
}

const addHours = (date: Date, hours: number) => new Date(date.getTime() + hours * 3_600_000)
const tokenHash = () => createHash("sha256").update(randomBytes(16)).digest("hex")

const past = await db
  .select({ id: schema.booking.id })
  .from(schema.booking)
  .where(lt(schema.booking.startsAt, tbilisi(0, 0)))
  .limit(1)
if (past.length === 0) {
  const services = await db.select().from(schema.service)
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

await db.$client.end()
console.log("Seeded.")
