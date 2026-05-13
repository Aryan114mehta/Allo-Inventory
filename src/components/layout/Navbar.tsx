"use client";

import Link from "next/link";
import { Package2 } from "lucide-react";

export function Navbar() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 h-14 border-b border-border/40 bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight hover:opacity-80 transition-opacity">
          <Package2 className="h-4 w-4 text-primary" />
          <span>Allo Inventory</span>
        </Link>
        <nav className="flex items-center gap-1">
          <Link
            href="/"
            className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            Products
          </Link>
        </nav>
      </div>
    </header>
  );
}
