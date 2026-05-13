"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, MapPin, ShoppingCart, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { ProductListItem, StockEntry } from "@/types";

interface Props {
  product: ProductListItem;
}

async function reserveProduct(productId: string, warehouseId: string, quantity: number) {
  const res = await fetch("/api/reservations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId, warehouseId, quantity }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? "Reservation failed");
  return json.data;
}

export function ProductCard({ product }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedWarehouse, setSelectedWarehouse] = useState<StockEntry | null>(
    product.stock.find((s) => s.available > 0) ?? null
  );
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      reserveProduct(product.id, selectedWarehouse!.warehouseId, quantity),
    onSuccess: (reservation) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      router.push(`/reservations/${reservation.id}`);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const maxAvailable = selectedWarehouse?.available ?? 0;
  const canReserve = !!selectedWarehouse && maxAvailable > 0 && !mutation.isPending;

  return (
    <div className="group relative flex flex-col rounded-lg border border-border bg-card p-5 transition-all duration-200 hover:border-border/80 hover:shadow-md hover:shadow-black/5">
      {/* Product header */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold leading-tight text-foreground">{product.name}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground font-mono">{product.sku}</p>
          </div>
        </div>
        <span className="shrink-0 text-sm font-semibold text-foreground">
          {formatCurrency(product.price)}
        </span>
      </div>

      <p className="mb-4 text-xs leading-relaxed text-muted-foreground line-clamp-2">
        {product.description}
      </p>

      {/* Warehouse stock */}
      <div className="mb-4 space-y-1.5">
        {product.stock.length === 0 ? (
          <p className="text-xs text-muted-foreground">No stock data available</p>
        ) : (
          product.stock.map((entry) => (
            <button
              key={entry.warehouseId}
              onClick={() => {
                setSelectedWarehouse(entry);
                setError(null);
                setQuantity(1);
              }}
              className={[
                "flex w-full items-center justify-between rounded-md border px-3 py-2 text-xs transition-colors",
                selectedWarehouse?.warehouseId === entry.warehouseId
                  ? "border-primary bg-primary/5 text-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-border/80 hover:text-foreground",
              ].join(" ")}
            >
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3 w-3" />
                {entry.warehouseName}
                <span className="text-muted-foreground/60">·</span>
                <span className="text-muted-foreground/70">{entry.warehouseLocation}</span>
              </span>
              <span
                className={[
                  "tabular-nums font-medium",
                  entry.available > 0 ? "text-emerald-500" : "text-rose-500",
                ].join(" ")}
              >
                {entry.available > 0 ? `${entry.available} avail.` : "Out of stock"}
              </span>
            </button>
          ))
        )}
      </div>

      {/* Quantity + Reserve */}
      {selectedWarehouse && maxAvailable > 0 && (
        <div className="mb-3 flex items-center gap-2">
          <label className="text-xs text-muted-foreground whitespace-nowrap">Qty:</label>
          <input
            type="number"
            min={1}
            max={maxAvailable}
            value={quantity}
            onChange={(e) => {
              const val = Math.max(1, Math.min(maxAvailable, Number(e.target.value)));
              setQuantity(val);
            }}
            className="w-16 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-primary transition-colors"
          />
          <span className="text-xs text-muted-foreground">of {maxAvailable}</span>
        </div>
      )}

      {error && (
        <div className="mb-3 flex items-start gap-2 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-400">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        onClick={() => {
          setError(null);
          mutation.mutate();
        }}
        disabled={!canReserve}
        className={[
          "mt-auto flex w-full items-center justify-center gap-2 rounded-md px-4 py-2 text-xs font-medium transition-all duration-150",
          canReserve
            ? "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98]"
            : "cursor-not-allowed bg-muted text-muted-foreground",
        ].join(" ")}
      >
        <ShoppingCart className="h-3.5 w-3.5" />
        {mutation.isPending
          ? "Reserving…"
          : !selectedWarehouse
          ? "Select a warehouse"
          : maxAvailable === 0
          ? "Out of stock"
          : "Reserve"}
      </button>
    </div>
  );
}
