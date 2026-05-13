import type { NextRequest } from "next/server";
import { getProductsWithStock } from "@/services/inventory";
import { ProductQuerySchema } from "@/schemas/product";
import { toApiError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const query = ProductQuerySchema.parse({
      warehouseId: searchParams.get("warehouseId") ?? undefined,
      search: searchParams.get("search") ?? undefined,
    });

    const products = await getProductsWithStock(query);
    return Response.json({ data: products });
  } catch (err) {
    const { message, code, status } = toApiError(err);
    return Response.json({ error: { message, code } }, { status });
  }
}
