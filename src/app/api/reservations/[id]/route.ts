import type { NextRequest } from "next/server";
import { getReservationById } from "@/services/reservation";
import { toApiError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const reservation = await getReservationById(id);
    return Response.json({ data: reservation });
  } catch (err) {
    const { message, code, status } = toApiError(err);
    return Response.json({ error: { message, code } }, { status });
  }
}
