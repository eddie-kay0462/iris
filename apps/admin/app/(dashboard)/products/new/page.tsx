"use client";

import { ProductForm } from "../../../components/products/ProductForm";

export default function AdminNewProductPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">New product</h1>
        <p className="text-sm text-slate-500">
          Add product information, pricing, and inventory.
        </p>
      </header>
      <ProductForm mode="create" />
    </section>
  );
}
