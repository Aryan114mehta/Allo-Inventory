"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { useInventory } from "@/hooks/useInventory";
import { ProductCard } from "./ProductCard";

export function ProductList() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const { data: products, isLoading, error, refetch } = useInventory(undefined, debouncedSearch || undefined);

  const handleSearch = (value: string) => {
    setSearch(value);
    clearTimeout((window as any).__searchTimer);
    (window as any).__searchTimer = setTimeout(() => setDebouncedSearch(value), 350);
  };

  return (
    <div>
      {/* Search */}
      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search products or SKUs…"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full max-w-sm rounded-md border border-border bg-background py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
        />
      </div>

      {/* States */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-72 animate-pulse rounded-lg border border-border bg-card"
            />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-6 py-8 text-center">
          <p className="text-sm text-rose-400">Failed to load products.</p>
          <button
            onClick={() => refetch()}
            className="mt-3 text-xs text-rose-400/80 underline underline-offset-2 hover:text-rose-400"
          >
            Try again
          </button>
        </div>
      )}

      {!isLoading && !error && products?.length === 0 && (
        <div className="rounded-lg border border-border bg-card px-6 py-16 text-center">
          <p className="text-sm text-muted-foreground">No products found.</p>
        </div>
      )}

      {!isLoading && !error && products && products.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
