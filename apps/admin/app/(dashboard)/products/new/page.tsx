"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProductForm } from "../../../components/products/ProductForm";

export default function AdminNewProductPage() {
  return (
    <section className="space-y-6">
      <Link href="/products" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Products
      </Link>
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
