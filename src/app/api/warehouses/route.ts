import { getWarehouses } from "@/services/inventory";
import { toApiError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const warehouses = await getWarehouses();
    return Response.json({ data: warehouses });
  } catch (err) {
    const { message, code, status } = toApiError(err);
    return Response.json({ error: { message, code } }, { status });
  }
}
