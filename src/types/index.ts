import type { Product, Warehouse, Inventory, Reservation, ReservationStatus, Prisma } from "../../prisma/generated-client";

export type { ReservationStatus };

export interface ProductWithStock extends Product {
  inventory: (Inventory & { warehouse: Warehouse })[];
}

export interface WarehouseWithAvailability extends Warehouse {
  inventory: Inventory[];
}

export interface ReservationWithDetails extends Reservation {
  product: Product;
  warehouse: Warehouse;
}

export interface StockEntry {
  warehouseId: string;
  warehouseName: string;
  warehouseLocation: string;
  total: number;
  reserved: number;
  available: number;
}

export interface ProductListItem {
  id: string;
  name: string;
  sku: string;
  description: string;
  price: string;
  imageUrl: string | null;
  stock: StockEntry[];
}

export interface ApiSuccess<T> {
  data: T;
}

export interface ApiError {
  error: {
    message: string;
    code: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
