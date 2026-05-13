import type { NextRequest } from "next/server";
import { cleanupExpiredReservations } from "@/services/reservation";
import { toApiError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = request.headers.get("Authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || secret !== expected) {
    return Response.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, { status: 401 });
  }

  try {
    const released = await cleanupExpiredReservations();
    return Response.json({ data: { released } });
  } catch (err) {
    const { message, code, status } = toApiError(err);
    return Response.json({ error: { message, code } }, { status });
  }
}
