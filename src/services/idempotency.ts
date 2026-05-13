import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";

const TTL_SECONDS = 86400; // 24 h

export interface IdempotencyRecord {
  statusCode: number;
  responseBody: string;
}

export async function checkIdempotency(
  key: string
): Promise<IdempotencyRecord | null> {
  if (redis) {
    const cached = await redis.get<IdempotencyRecord>(key);
    if (cached) return cached;
  }

  const record = await prisma.idempotencyRecord.findUnique({ where: { key } });
  if (!record) return null;

  return { statusCode: record.statusCode, responseBody: record.responseBody };
}

export async function storeIdempotency(
  key: string,
  record: IdempotencyRecord
): Promise<void> {
  await prisma.idempotencyRecord.upsert({
    where: { key },
    create: { key, statusCode: record.statusCode, responseBody: record.responseBody },
    update: {},
  });

  if (redis) {
    await redis.setex(key, TTL_SECONDS, record);
  }
}
