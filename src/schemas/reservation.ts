import { z } from "zod";

export const CreateReservationSchema = z.object({
  productId: z.string().min(1, "productId is required"),
  warehouseId: z.string().min(1, "warehouseId is required"),
  quantity: z.number().int().positive("quantity must be a positive integer"),
  idempotencyKey: z.string().optional(),
});

export type CreateReservationInput = z.infer<typeof CreateReservationSchema>;

export const ReservationIdSchema = z.object({
  id: z.string().min(1, "id is required"),
});
