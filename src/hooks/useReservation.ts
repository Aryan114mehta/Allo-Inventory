"use client";

import { useQuery } from "@tanstack/react-query";
import type { ReservationWithDetails } from "@/types";

async function fetchReservation(id: string): Promise<ReservationWithDetails> {
  const res = await fetch(`/api/reservations/${id}`);
  if (!res.ok) throw new Error("Failed to fetch reservation");
  const json = await res.json();
  return json.data;
}

export function useReservation(id: string) {
  return useQuery({
    queryKey: ["reservation", id],
    queryFn: () => fetchReservation(id),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}
