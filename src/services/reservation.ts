import { prisma } from "@/lib/db";
import { getExpiryDate } from "@/lib/utils";
import {
  InsufficientStockError,
  ReservationExpiredError,
  ReservationNotFoundError,
  ReservationAlreadyFinalizedError,
} from "@/lib/errors";
import type { CreateReservationInput } from "@/schemas/reservation";
import type { ReservationWithDetails } from "@/types";

export async function createReservation(
  input: CreateReservationInput
): Promise<ReservationWithDetails> {
  const { productId, warehouseId, quantity, idempotencyKey } = input;

  return prisma.$transaction(async (tx) => {
    // SELECT FOR UPDATE — acquires a row-level lock, blocking concurrent
    // transactions from reading stale reserved counts until we commit.
    const stock = await tx.inventory.findFirst({
      where: { productId, warehouseId },
      // Prisma raw lock via queryRaw is required; the JS API doesn't expose
      // SELECT FOR UPDATE directly, so we use a two-step approach:
      // findFirst then update with a where-clause that acts as an optimistic
      // version check — but we want a true lock, so we use executeRaw.
    });

    if (!stock) {
      throw new InsufficientStockError(0, quantity);
    }

    const available = stock.total - stock.reserved;
    if (available < quantity) {
      throw new InsufficientStockError(available, quantity);
    }

    // Lock the row BEFORE reading to prevent TOCTOU under concurrent load.
    // Prisma doesn't surface FOR UPDATE via its fluent API, so we use
    // $executeRaw to obtain the advisory lock at the DB level.
    await tx.$executeRaw`
      SELECT id FROM "Inventory"
      WHERE id = ${stock.id}
      FOR UPDATE
    `;

    // Re-read after acquiring the lock to see any committed changes
    // from racing transactions that beat us to the lock.
    const lockedStock = await tx.inventory.findUnique({
      where: { id: stock.id },
    });

    const lockedAvailable = (lockedStock!.total - lockedStock!.reserved);
    if (lockedAvailable < quantity) {
      throw new InsufficientStockError(lockedAvailable, quantity);
    }

    const expiresAt = getExpiryDate();

    const reservation = await tx.reservation.create({
      data: {
        productId,
        warehouseId,
        quantity,
        status: "PENDING",
        expiresAt,
        ...(idempotencyKey ? { idempotencyKey } : {}),
      },
      include: { product: true, warehouse: true },
    });

    await tx.inventory.update({
      where: { id: stock.id },
      data: { reserved: { increment: quantity } },
    });

    return reservation;
  });
}

export async function confirmReservation(
  id: string
): Promise<ReservationWithDetails> {
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: { product: true, warehouse: true },
  });

  if (!reservation) throw new ReservationNotFoundError(id);

  if (reservation.status !== "PENDING") {
    throw new ReservationAlreadyFinalizedError(reservation.status);
  }

  if (reservation.expiresAt < new Date()) {
    // Lazy-release the hold since the cron may not have run yet.
    await releaseExpiredReservation(reservation.id, reservation.productId, reservation.warehouseId, reservation.quantity);
    throw new ReservationExpiredError();
  }

  return prisma.reservation.update({
    where: { id },
    data: { status: "CONFIRMED" },
    include: { product: true, warehouse: true },
  });
}

export async function releaseReservation(
  id: string
): Promise<ReservationWithDetails> {
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: { product: true, warehouse: true },
  });

  if (!reservation) throw new ReservationNotFoundError(id);

  if (reservation.status !== "PENDING") {
    throw new ReservationAlreadyFinalizedError(reservation.status);
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.reservation.update({
      where: { id },
      data: { status: "RELEASED" },
      include: { product: true, warehouse: true },
    });

    await tx.inventory.updateMany({
      where: { productId: reservation.productId, warehouseId: reservation.warehouseId },
      data: { reserved: { decrement: reservation.quantity } },
    });

    return updated;
  });
}

export async function cleanupExpiredReservations(): Promise<number> {
  const now = new Date();

  const expired = await prisma.reservation.findMany({
    where: { status: "PENDING", expiresAt: { lt: now } },
    select: { id: true, productId: true, warehouseId: true, quantity: true },
  });

  if (expired.length === 0) return 0;

  await prisma.$transaction(
    expired.map((r) =>
      prisma.reservation.update({
        where: { id: r.id },
        data: { status: "RELEASED" },
      })
    )
  );

  // Recompute reserved counts atomically per (product, warehouse) pair
  const grouped = expired.reduce<Record<string, { productId: string; warehouseId: string; qty: number }>>(
    (acc, r) => {
      const key = `${r.productId}:${r.warehouseId}`;
      if (!acc[key]) acc[key] = { productId: r.productId, warehouseId: r.warehouseId, qty: 0 };
      acc[key].qty += r.quantity;
      return acc;
    },
    {}
  );

  await prisma.$transaction(
    Object.values(grouped).map(({ productId, warehouseId, qty }) =>
      prisma.inventory.updateMany({
        where: { productId, warehouseId },
        data: { reserved: { decrement: qty } },
      })
    )
  );

  return expired.length;
}

async function releaseExpiredReservation(
  id: string,
  productId: string,
  warehouseId: string,
  quantity: number
): Promise<void> {
  await prisma.$transaction([
    prisma.reservation.update({ where: { id }, data: { status: "RELEASED" } }),
    prisma.inventory.updateMany({
      where: { productId, warehouseId },
      data: { reserved: { decrement: quantity } },
    }),
  ]);
}

export async function getReservationById(id: string): Promise<ReservationWithDetails> {
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: { product: true, warehouse: true },
  });

  if (!reservation) throw new ReservationNotFoundError(id);
  return reservation;
}
