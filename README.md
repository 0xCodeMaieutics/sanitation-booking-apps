<img src="assets/icon.svg" width="64" height="64" alt="">

# sanitation-booking-app

Booking for a one-person sanitation business, in Georgian and mobile-first. Domain language lives in [CONTEXT.md](CONTEXT.md); decisions in [docs/adr](docs/adr).

| Path            | What                                                                             |
| --------------- | -------------------------------------------------------------------------------- |
| `apps/app`      | Client app (port 3000): pick a Service, a day and a time, confirm by SMS         |
| `apps/admin`    | Admin app (port 3001): bookings, callback requests, services, time off, settings |
| `packages/db`   | Drizzle schema, migrations, seed                                                 |
| `packages/core` | Domain logic: availability, bookings, callback requests, SMS                     |
| `packages/api`  | tRPC routers; mutations for writes, server-side callers for reads                |
| `packages/ui`   | shadcn components and theme                                                      |

## Setup

Needs Node 24, pnpm and Docker.

```sh
make setup      # .env, install, Postgres on :5434, migrate, seed
pnpm dev        # both apps
```

Outside production no SMS is sent: every message, including verification codes, is printed to the dev server console as `[sms] to …`. The admin sign-in form is pre-filled with `ADMIN_PHONE` from `.env`.

## Conventions

- Writes go through tRPC mutations; reads happen in server components via `serverCaller()`. `useQuery` is banned by lint in `apps/`.
- Loading and error states use `loading.tsx` and `error.tsx`.
- Change `packages/db/src/schema.ts`, then run `pnpm db:generate` and commit the migration. CI fails if the schema and migrations drift apart, and applies migrations to production on `main`.

## Checks

```sh
pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm turbo-env:check
```

## Deploy

Both apps deploy to Vercel (`fra1`) with Neon Postgres in Frankfurt. Each needs `DATABASE_URL`, `SMS_PROVIDER=sender.ge`, `SENDER_GE_API_KEY`, `ADMIN_PHONE` and `APP_URL` (the client app's public URL, used in SMS links). The `production` GitHub environment needs `DATABASE_URL` for the migrate job.
