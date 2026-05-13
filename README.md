# Allo Inventory — Reservation System
A Next.js 16 (App Router) application that solves the checkout race condition using PostgreSQL row-level locking and time-boxed reservations.



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


### Prerequisites

- Node.js 20+
- A hosted PostgreSQL database (Supabase, Neon, or Railway — all have free tiers)
- (Optional) Upstash Redis for idempotency caching

### 1. Clone & Install

```bash
git clone <Allo-Inventory>
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
npx prisma migrate dev --name init

npx prisma db seed
```

### 4. Start Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---



## API Reference

| Method | Path | Request Body | Description |
|---|---|---|---|
| `GET` | `/api/products` | - | List products with availability. Supports `?search=` and `?warehouseId=`. |
| `GET` | `/api/warehouses` | - | List all warehouses with their inventory summary. |
| `POST` | `/api/reservations` | `{ productId, warehouseId, quantity }` | Create a time-boxed reservation. Returns `201` on success, `409` on stock conflict. |
| `GET` | `/api/reservations/:id` | - | Fetch reservation status and details. Returns `404` if not found. |
| `POST` | `/api/reservations/:id/confirm` | - | Finalize a reservation (e.g., after payment). Returns `410` if expired, `409` if already finalized. |
| `POST` | `/api/reservations/:id/release` | - | Cancel a reservation and release stock back to the warehouse. |
| `GET` | `/api/cron/cleanup` | - | Admin endpoint to release all expired reservations. Requires `Authorization` header. |

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



### Trade-offs Made

- **SELECT FOR UPDATE via raw SQL** — Prisma's fluent API doesn't expose `FOR UPDATE` locks. I use `$executeRaw` to acquire the lock then `findUnique` to re-read, which is a two-round-trip approach. With more time I'd use a Prisma extension or drop to raw SQL for the entire transaction.

- **No distributed locking (Redis)** — The PostgreSQL transaction lock is sufficient for correctness and handles horizontal scaling because all instances share the same DB. Redis distributed locks would add complexity without correctness benefit here.

- **Cron granularity** — Vercel Cron minimum is 1 minute on Hobby, 1 second on Pro. A 10-minute reservation window with a 5-minute cleanup sweep means stock could be held up to ~15 minutes in the worst case. A queue-based background worker (BullMQ + Redis) would release exactly at expiry.

- **No auth** — Reservations are not tied to a user session. In production you'd link `Reservation.userId` to an authenticated user and scope the confirm/release endpoints.

- **No WebSocket push** — The checkout page doesn't receive a server push when expiry occurs; it relies on the countdown timer + lazy check on confirm. With more time I'd add a Server-Sent Events endpoint so the UI auto-updates on expiry.

### With More Time

- **Real-time Updates**: Implement Server-Sent Events (SSE) or WebSockets to notify the checkout page immediately when a reservation expires.
- **E2E Testing**: Add Playwright tests to simulate high-concurrency race conditions and verify the `SELECT FOR UPDATE` locking behavior.
- **Advanced Auth**: Integrate NextAuth.js or Clerk to associate reservations with verified user accounts.
- **Queue-based Cleanup**: Replace the Cron sweep with BullMQ or Inngest to release stock precisely at the second of expiry rather than in batches.
- **Admin Dashboard**: Build a protected view for warehouse managers to monitor reservation trends and stock velocity.
