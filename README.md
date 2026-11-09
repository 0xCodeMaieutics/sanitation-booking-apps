<img src="assets/icon.svg" width="64" height="64" alt="">

# sanitation-booking-app

Cleanly: booking for sanitation Companies, in Georgian and mobile-first. Each Company has its own Booking Link (`/<slug>`) and signs in to the admin app with its Admin Phones. Domain language lives in [CONTEXT.md](CONTEXT.md); decisions in [docs/adr](docs/adr).

| Path            | What                                                                                          |
| --------------- | --------------------------------------------------------------------------------------------- |
| `apps/app`      | Client app (port 3000): open a Booking Link, pick a Service, a day and a time, confirm by SMS |
| `apps/admin`    | Admin app (port 3001): bookings, callback requests, services, time off, settings, phones      |
| `packages/db`   | Drizzle schema, migrations, seed                                                              |
| `packages/core` | Domain logic: Companies, availability, bookings, callback requests, SMS                       |
| `packages/api`  | tRPC routers; mutations for writes, server-side callers for reads                             |
| `packages/ui`   | shadcn components and theme                                                                   |

## Setup

Needs Node 24, pnpm and Docker.

```sh
make setup      # .env, install, Postgres on :5434, migrate, seed
pnpm dev        # both apps
```

The seed creates two Companies: ალეკო at `/aleko-tbilisi` (Admin Phones +995 555 12 34 56 with alerts and +995 555 12 34 57 without) and სუფთა ქალაქი at `/supta-qalaqi` (+995 555 65 43 21). Outside production no SMS is sent: every message, including verification codes, is printed to the dev server console as `[sms] to …`. The admin sign-in form is pre-filled with ალეკო's first phone.

## Companies

Cleanly staff onboard and manage Companies from the command line, against whatever `DATABASE_URL` points at:

```sh
pnpm company list
pnpm company create --slug aleko-tbilisi --name "ალეკო" --phone "+995 555 12 34 56"
pnpm company rename --slug aleko-tbilisi --name "ალეკო და ძმები"
pnpm company set-slug --slug aleko-tbilisi --new-slug aleko   # the old slug keeps redirecting
pnpm company suspend --slug aleko
pnpm company restore --slug aleko
pnpm company add-phone --slug aleko --phone "+995 555 00 00 00"
```

Admins manage their own Admin Phones in the admin app's settings.

## Conventions

- Writes go through tRPC mutations; reads happen in server components via `serverCaller()`. `useQuery` is banned by lint in `apps/`.
- Loading and error states use `loading.tsx` and `error.tsx`.
- Change `packages/db/src/schema.ts`, then run `pnpm db:generate` and commit the migration. CI fails if the schema and migrations drift apart, and applies migrations to production on `main`.

## Checks

```sh
pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm turbo-env:check
```

## Deploy

Both apps deploy to Vercel (`fra1`) with Neon Postgres in Frankfurt. Each needs `DATABASE_URL`, `SMS_PROVIDER=sender.ge`, `SENDER_GE_API_KEY` and `APP_URL` (the client app's public URL, used in Manage Links and Booking Links). The `production` GitHub environment needs `DATABASE_URL` for the migrate job.
