"use client";

import { useQuery } from "@tanstack/react-query";
import type { ProductListItem } from "@/types";

async function fetchProducts(warehouseId?: string, search?: string): Promise<ProductListItem[]> {
  const params = new URLSearchParams();
  if (warehouseId) params.set("warehouseId", warehouseId);
  if (search) params.set("search", search);

  const res = await fetch(`/api/products?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch products");
  const json = await res.json();
  return json.data;
}

export function useInventory(warehouseId?: string, search?: string) {
  return useQuery({
    queryKey: ["products", warehouseId, search],
    queryFn: () => fetchProducts(warehouseId, search),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}
