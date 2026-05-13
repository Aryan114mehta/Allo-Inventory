"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle, AlertCircle, Package, MapPin, Hash } from "lucide-react";
import { CountdownTimer } from "./CountdownTimer";
import { formatCurrency } from "@/lib/utils";
import type { ReservationWithDetails } from "@/types";

interface Props {
  reservation: ReservationWithDetails;
}

async function postAction(url: string) {
  const res = await fetch(url, { method: "POST" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? "Action failed");
  return json.data;
}

const STATUS_CONFIG = {
  CONFIRMED: {
    label: "Confirmed",
    icon: CheckCircle2,
    color: "text-emerald-500",
    bg: "border-emerald-500/30 bg-emerald-500/10",
  },
  RELEASED: {
    label: "Cancelled",
    icon: XCircle,
    color: "text-rose-500",
    bg: "border-rose-500/30 bg-rose-500/10",
  },
  PENDING: {
    label: "Pending",
    icon: AlertCircle,
    color: "text-amber-500",
    bg: "border-amber-500/30 bg-amber-500/10",
  },
} as const;

export function ReservationDetails({ reservation: initial }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<ReservationWithDetails>(initial);

  const confirmMutation = useMutation({
    mutationFn: () => postAction(`/api/reservations/${current.id}/confirm`),
    onSuccess: (data) => {
      setCurrent(data);
      queryClient.invalidateQueries({ queryKey: ["reservation", current.id] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const releaseMutation = useMutation({
    mutationFn: () => postAction(`/api/reservations/${current.id}/release`),
    onSuccess: (data) => {
      setCurrent(data);
      queryClient.invalidateQueries({ queryKey: ["reservation", current.id] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const isFinalized = current.status !== "PENDING";
  const isPending = confirmMutation.isPending || releaseMutation.isPending;
  const config = STATUS_CONFIG[current.status as keyof typeof STATUS_CONFIG];
  const StatusIcon = config.icon;

  return (
    <div className="mx-auto w-full max-w-lg">
      {/* Status badge */}
      <div className={`mb-6 flex items-center gap-2 rounded-lg border px-4 py-3 ${config.bg}`}>
        <StatusIcon className={`h-4 w-4 shrink-0 ${config.color}`} />
        <span className={`text-sm font-medium ${config.color}`}>
          Reservation {config.label}
        </span>
      </div>

      {/* Details card */}
      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">Reservation Details</h2>
        </div>

        <dl className="divide-y divide-border">
          {[
            {
              icon: Hash,
              label: "Reservation ID",
              value: <span className="font-mono text-xs">{current.id}</span>,
            },
            {
              icon: Package,
              label: "Product",
              value: (
                <span>
                  {current.product.name}{" "}
                  <span className="font-mono text-xs text-muted-foreground">
                    ({current.product.sku})
                  </span>
                </span>
              ),
            },
            {
              icon: MapPin,
              label: "Warehouse",
              value: current.warehouse.name,
            },
            {
              icon: Package,
              label: "Quantity",
              value: `${current.quantity} unit${current.quantity !== 1 ? "s" : ""}`,
            },
            {
              icon: Package,
              label: "Unit Price",
              value: formatCurrency(current.product.price.toString()),
            },
            {
              icon: Package,
              label: "Total",
              value: (
                <span className="font-semibold">
                  {formatCurrency(
                    (Number(current.product.price) * current.quantity).toString()
                  )}
                </span>
              ),
            },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-4 px-5 py-3">
              <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <dt className="w-32 shrink-0 text-xs text-muted-foreground">{label}</dt>
              <dd className="text-xs text-foreground">{value}</dd>
            </div>
          ))}
        </dl>

        {/* Timer */}
        {!isFinalized && (
          <div className="flex items-center justify-between border-t border-border px-5 py-4">
            <span className="text-xs text-muted-foreground">Expires in</span>
            <CountdownTimer
              expiresAt={current.expiresAt}
              onExpired={() => setError("Your reservation has expired. The hold has been released.")}
            />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Actions */}
      {!isFinalized && (
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => { setError(null); confirmMutation.mutate(); }}
            disabled={isPending}
            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            {confirmMutation.isPending ? "Confirming…" : "Confirm Purchase"}
          </button>
          <button
            onClick={() => { setError(null); releaseMutation.mutate(); }}
            disabled={isPending}
            className="flex items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-accent active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <XCircle className="h-4 w-4" />
            {releaseMutation.isPending ? "Cancelling…" : "Cancel"}
          </button>
        </div>
      )}

      {isFinalized && (
        <button
          onClick={() => router.push("/")}
          className="mt-4 w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
        >
          Back to Products
        </button>
      )}
    </div>
  );
}
