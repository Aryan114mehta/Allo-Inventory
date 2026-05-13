import { z } from "zod";

export const ProductQuerySchema = z.object({
  warehouseId: z.string().optional(),
  search: z.string().optional(),
});

export type ProductQuery = z.infer<typeof ProductQuerySchema>;
