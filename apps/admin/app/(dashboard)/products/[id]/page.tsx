"use client";

import { use, useEffect, useState } from "react";
import { ProductForm } from "../../../components/products/ProductForm";
import { type Product, fetchAdminProduct, useDeleteProduct, usePublishProduct } from "@/lib/api/products";
import { useRouter } from "next/navigation";
import Link from "next/link";

type AdminProductDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default function AdminProductDetailPage({
  params,
}: AdminProductDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const deleteMutation = useDeleteProduct();
  const publishMutation = usePublishProduct();

  useEffect(() => {
    fetchAdminProduct(id)
      .then(setProduct)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <section className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        <div className="h-96 animate-pulse rounded-lg bg-slate-100" />
      </section>
    );
  }

  if (error || !product) {
    return (
      <section className="space-y-6">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error || "Product not found"}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="mb-4">
        <Link
          href="/products"
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to all products
        </Link>
      </div>
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Product detail
          </p>
          <h1 className="text-2xl font-semibold">{product.title}</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              await publishMutation.mutateAsync(product.id);
              const updated = await fetchAdminProduct(id);
              setProduct(updated);
            }}
            className="rounded-md border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"
          >
            {product.published ? "Unpublish" : "Publish"}
          </button>
          <button
            onClick={async () => {
              if (confirm("Delete this product?")) {
                await deleteMutation.mutateAsync(product.id);
                router.push("/products");
              }
            }}
            className="rounded-md border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </header>
      <ProductForm
        mode="edit"
        product={product}
        onRefresh={() => fetchAdminProduct(id).then(setProduct).catch(() => {})}
      />
    </section>
  );
}
