import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

export function getExpiryDate(minutes = 10): Date {
  const expiryMinutes = Number(
    process.env.RESERVATION_EXPIRY_MINUTES ?? minutes
  );
  return new Date(Date.now() + expiryMinutes * 60 * 1000);
}
