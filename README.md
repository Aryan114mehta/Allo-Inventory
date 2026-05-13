# Allo Inventory — Reservation System

A Next.js 16 (App Router) application that solves the checkout race condition using PostgreSQL row-level locking and time-boxed reservations.

## Live Demo

> Deploy to Vercel (see below) and paste the URL here.

---

## Architecture

```
UI (React + TanStack Query)
  → API Routes (thin — validate, delegate, respond)
    → Services (business logic — reservation.ts, inventory.ts)
      → Prisma (data access — $transaction + SELECT FOR UPDATE)
        → PostgreSQL (Supabase / Neon / Railway)
```

**Concurrency guarantee** — `POST /api/reservations` runs inside a `prisma.$transaction`. Before reading the available count it issues a raw `SELECT ... FOR UPDATE` which acquires a PostgreSQL row-level lock on the `Inventory` row. Any concurrent request for the same `(productId, warehouseId)` pair will block at the lock, then re-read the post-commit count, and throw `InsufficientStockError` (→ 409) if stock is depleted. This is stronger than optimistic locking because it avoids retry loops and is correct under any concurrency level.

---

## Running Locally

### Prerequisites

- Node.js 20+
- A hosted PostgreSQL database (Supabase, Neon, or Railway — all have free tiers)
- (Optional) Upstash Redis for idempotency caching

### 1. Clone & Install

```bash
git clone <your-repo>
cd algo
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and fill in:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (PgBouncer transaction mode for Supabase) |
| `DIRECT_URL` | Direct PostgreSQL URL for migrations (session mode, bypasses PgBouncer) |
| `REDIS_URL` | Upstash Redis REST URL (optional) |
| `REDIS_TOKEN` | Upstash Redis token (optional) |
| `CRON_SECRET` | Random secret to protect `/api/cron/cleanup` |
| `RESERVATION_EXPIRY_MINUTES` | Hold window in minutes (default: 10) |

### 3. Run Migrations & Seed

```bash
# Push schema to the database
npx prisma migrate dev --name init

# Seed with sample products and warehouses
npx prisma db seed
```

### 4. Start Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deploying to Vercel

1. Push your repo to GitHub.
2. Import the repo on [vercel.com](https://vercel.com).
3. Add all env vars from `.env` in **Settings → Environment Variables**.
4. On first deploy, run migrations from your local machine:
   ```bash
   npx prisma migrate deploy
   npx prisma db seed
   ```
5. `vercel.json` already configures the cron job — it will activate automatically on Pro/Hobby plans.

---

## How Expiry Works

### Production (Vercel Cron)

`vercel.json` schedules `GET /api/cron/cleanup` every 5 minutes. The handler:
1. Finds all `PENDING` reservations where `expiresAt < now`.
2. Bulk-updates their status to `RELEASED` in a batched transaction.
3. Decrements `Inventory.reserved` for each released group.

The endpoint is protected by a `CRON_SECRET` bearer token — Vercel passes this automatically via `Authorization` header when it invokes the cron.

### Lazy Cleanup (Belt-and-Suspenders)

Every call to `confirmReservation` checks `expiresAt < now` before proceeding. If expired, it releases the hold inline and returns a 410. This means even if the cron misses a window, stock is never permanently locked.

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/products` | List products with available stock per warehouse. Supports `?search=` and `?warehouseId=`. |
| `GET` | `/api/warehouses` | List all warehouses. |
| `POST` | `/api/reservations` | Reserve units. Returns 409 if insufficient stock. |
| `GET` | `/api/reservations/:id` | Get reservation details. |
| `POST` | `/api/reservations/:id/confirm` | Confirm (payment succeeded). Returns 410 if expired. |
| `POST` | `/api/reservations/:id/release` | Release early (payment failed / user cancelled). |
| `GET` | `/api/cron/cleanup` | Release all expired reservations (cron-only, requires `Authorization: Bearer <CRON_SECRET>`). |

### Idempotency (Bonus)

Pass an `Idempotency-Key` header (or `idempotencyKey` in the request body) with `POST /api/reservations`. On retry, the server returns the original response body and status code without repeating the reservation. Records are stored in `IdempotencyRecord` (Postgres) and cached in Redis (if configured) for 24 hours.

---

## Project Structure

```
src/
├── app/                        # Next.js App Router
│   ├── api/
│   │   ├── products/route.ts
│   │   ├── warehouses/route.ts
│   │   ├── reservations/
│   │   │   ├── route.ts        # POST — create reservation
│   │   │   └── [id]/
│   │   │       ├── route.ts    # GET — fetch reservation
│   │   │       ├── confirm/route.ts
│   │   │       └── release/route.ts
│   │   └── cron/cleanup/route.ts
│   ├── reservations/[id]/page.tsx
│   ├── providers.tsx
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── layout/Navbar.tsx
│   └── modules/
│       ├── inventory/ProductCard.tsx
│       ├── inventory/ProductList.tsx
│       ├── reservation/CountdownTimer.tsx
│       └── reservation/ReservationDetails.tsx
├── hooks/
│   ├── useCountdown.ts
│   ├── useInventory.ts
│   └── useReservation.ts
├── lib/
│   ├── db.ts                   # Prisma singleton
│   ├── redis.ts                # Optional Redis singleton
│   ├── errors.ts               # Typed error hierarchy
│   └── utils.ts
├── schemas/
│   ├── reservation.ts          # Zod schemas
│   └── product.ts
├── services/
│   ├── inventory.ts            # Read-only queries
│   ├── reservation.ts          # Core business logic (atomic transactions)
│   └── idempotency.ts
└── types/index.ts
prisma/
├── schema.prisma
└── seed.ts
vercel.json                     # Cron job config
```

---

## Trade-offs & What I'd Do With More Time

### Trade-offs Made

- **SELECT FOR UPDATE via raw SQL** — Prisma's fluent API doesn't expose `FOR UPDATE` locks. I use `$executeRaw` to acquire the lock then `findUnique` to re-read, which is a two-round-trip approach. With more time I'd use a Prisma extension or drop to raw SQL for the entire transaction.

- **No distributed locking (Redis)** — The PostgreSQL transaction lock is sufficient for correctness and handles horizontal scaling because all instances share the same DB. Redis distributed locks would add complexity without correctness benefit here.

- **Cron granularity** — Vercel Cron minimum is 1 minute on Hobby, 1 second on Pro. A 10-minute reservation window with a 5-minute cleanup sweep means stock could be held up to ~15 minutes in the worst case. A queue-based background worker (BullMQ + Redis) would release exactly at expiry.

- **No auth** — Reservations are not tied to a user session. In production you'd link `Reservation.userId` to an authenticated user and scope the confirm/release endpoints.

- **No WebSocket push** — The checkout page doesn't receive a server push when expiry occurs; it relies on the countdown timer + lazy check on confirm. With more time I'd add a Server-Sent Events endpoint so the UI auto-updates on expiry.

### With More Time

- Add Zod validation to all query params with proper error messages.
- Add E2E tests (Playwright) for the full reserve → confirm / release flow and a concurrency test using `Promise.all`.
- Add a user auth layer (NextAuth / Clerk) so reservations are scoped to accounts.
- Replace the Cron with a BullMQ delayed job that fires exactly at `expiresAt`.
- Add an admin dashboard showing live stock levels and reservation activity.
