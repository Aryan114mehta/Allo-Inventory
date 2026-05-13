export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number,
    public readonly code: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class InsufficientStockError extends AppError {
  constructor(available = 0, requested = 0) {
    super(
      `Insufficient stock: ${available} unit(s) available, ${requested} requested.`,
      409,
      "INSUFFICIENT_STOCK"
    );
  }
}

export class ReservationExpiredError extends AppError {
  constructor() {
    super("This reservation has expired.", 410, "RESERVATION_EXPIRED");
  }
}

export class ReservationNotFoundError extends AppError {
  constructor(id: string) {
    super(`Reservation '${id}' not found.`, 404, "RESERVATION_NOT_FOUND");
  }
}

export class ReservationAlreadyFinalizedError extends AppError {
  constructor(status: string) {
    super(
      `Reservation has already been ${status.toLowerCase()}.`,
      409,
      "RESERVATION_ALREADY_FINALIZED"
    );
  }
}

export function toApiError(err: unknown): { message: string; code: string; status: number } {
  if (err instanceof AppError) {
    return { message: err.message, code: err.code, status: err.statusCode };
  }
  console.error("[Unhandled error]", err);
  return { message: "An unexpected error occurred.", code: "INTERNAL_ERROR", status: 500 };
}
