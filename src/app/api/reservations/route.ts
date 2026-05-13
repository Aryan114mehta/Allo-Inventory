import type { NextRequest } from "next/server";
import { ZodError } from "zod";
import { CreateReservationSchema } from "@/schemas/reservation";
import { createReservation } from "@/services/reservation";
import { checkIdempotency, storeIdempotency } from "@/services/idempotency";
import { toApiError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = CreateReservationSchema.parse(body);

    // Idempotency — bonus feature
    const idempotencyKey = request.headers.get("Idempotency-Key") ?? input.idempotencyKey;

    if (idempotencyKey) {
      const cached = await checkIdempotency(idempotencyKey);
      if (cached) {
        return new Response(cached.responseBody, {
          status: cached.statusCode,
          headers: { "Content-Type": "application/json", "X-Idempotent-Replay": "true" },
        });
      }
    }

    const reservation = await createReservation({
      ...input,
      idempotencyKey: idempotencyKey ?? undefined,
    });

    const responseBody = JSON.stringify({ data: reservation });

    if (idempotencyKey) {
      await storeIdempotency(idempotencyKey, { statusCode: 201, responseBody });
    }

    return new Response(responseBody, {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return Response.json(
        { error: { message: err.issues[0]?.message ?? "Validation error", code: "VALIDATION_ERROR" } },
        { status: 400 }
      );
    }
    const { message, code, status } = toApiError(err);
    return Response.json({ error: { message, code } }, { status });
  }
}
