import { ProductList } from "@/components/modules/inventory/ProductList";

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Products
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Select a warehouse and reserve stock during checkout.
        </p>
      </div>
      <ProductList />
    </main>
  );
}
