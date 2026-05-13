import { toApiError } from "@/lib/errors";
import { confirmReservation } from "@/services/reservation";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const reservation = await confirmReservation(id);
    return Response.json({ data: reservation });
  } catch (err) {
    const { message, code, status } = toApiError(err);
    return Response.json({ error: { message, code } }, { status });
  }
}
