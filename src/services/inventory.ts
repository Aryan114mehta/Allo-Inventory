import { prisma } from "@/lib/db";
import type { ProductListItem, WarehouseWithAvailability } from "@/types";
import type { ProductQuery } from "@/schemas/product";

export async function getProductsWithStock(
  query: ProductQuery = {}
): Promise<ProductListItem[]> {
  const products = await prisma.product.findMany({
    where: query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" } },
            { sku: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: {
      inventory: {
        where: query.warehouseId ? { warehouseId: query.warehouseId } : undefined,
        include: { warehouse: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    description: p.description,
    price: p.price.toString(),
    imageUrl: p.imageUrl,
    stock: p.inventory.map((inv) => ({
      warehouseId: inv.warehouseId,
      warehouseName: inv.warehouse.name,
      warehouseLocation: inv.warehouse.location,
      total: inv.total,
      reserved: inv.reserved,
      available: Math.max(0, inv.total - inv.reserved),
    })),
  }));
}

export async function getWarehouses(): Promise<WarehouseWithAvailability[]> {
  return prisma.warehouse.findMany({
    include: { inventory: true },
    orderBy: { name: "asc" },
  });
}
