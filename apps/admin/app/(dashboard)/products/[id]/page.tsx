"use client";

import { use, useEffect, useState } from "react";
import { ProductForm } from "../../../components/products/ProductForm";
import { type Product, fetchAdminProduct, useDeleteProduct, useSetProductStatus } from "@/lib/api/products";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

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

  const [updatingStatus, setUpdatingStatus] = useState(false);

  const deleteMutation = useDeleteProduct();
  const setStatusMutation = useSetProductStatus();

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
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
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
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-2">
            {updatingStatus && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
            <select
              value={product.status}
              disabled={updatingStatus}
              onChange={async (e) => {
                const status = e.target.value as "draft" | "active" | "archived";
                if (status === product.status) return;
                setUpdatingStatus(true);
                try {
                  await setStatusMutation.mutateAsync({ id: product.id, status });
                  const updated = await fetchAdminProduct(id);
                  setProduct(updated);
                  const label = status === "active" ? "Active — now live on the site" : status === "draft" ? "Draft — hidden from the site" : "Archived — hidden from the site";
                  toast.success(`Status set to ${label}`);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Failed to update status", { duration: 6000 });
                } finally {
                  setUpdatingStatus(false);
                }
              }}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>
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
