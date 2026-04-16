"use client";

import { useEffect, useState } from "react";
import { getMyPreorders, type MyPreorder, type PreorderStatus } from "@/lib/api/preorders";

const STATUS_LABELS: Record<PreorderStatus, string> = {
  pending: "Pending",
  stock_held: "Stock Ready",
  fulfilled: "Fulfilled",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

const STATUS_CLASSES: Record<PreorderStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  stock_held: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  fulfilled: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  cancelled: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  refunded: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(amount: number) {
  return `GH₵${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function MyPreordersPage() {
  const [preorders, setPreorders] = useState<MyPreorder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMyPreorders()
      .then(setPreorders)
      .catch(() => setError("Failed to load pre-orders."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">My Pre-orders</h1>

      {preorders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 py-16 text-center dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            You have no pre-orders yet.
          </p>
          <a
            href="/products"
            className="mt-3 inline-block text-sm font-medium text-black underline underline-offset-2 dark:text-white"
          >
            Browse products
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {preorders.map((order) => {
            const isReady = order.status === "stock_held";
            const image =
              order.product_variants?.product_images?.[0]?.src ?? null;

            return (
              <div
                key={order.id}
                className={`rounded-xl border p-4 transition-colors ${
                  isReady
                    ? "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/30"
                    : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Thumbnail */}
                  {image && (
                    <img
                      src={image}
                      alt={order.product_name}
                      className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
                    />
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {order.product_name}
                        </p>
                        {order.variant_title && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {order.variant_title}
                          </p>
                        )}
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLASSES[order.status]}`}
                      >
                        {STATUS_LABELS[order.status]}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
                      <span>
                        {order.quantity} × {formatCurrency(order.unit_price)}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(order.unit_price * order.quantity)}
                      </span>
                      <span className="text-gray-400">#{order.order_number}</span>
                      <span>{formatDate(order.created_at)}</span>
                    </div>

                    {/* Stock ready banner */}
                    {isReady && (
                      <div className="mt-2 flex items-center gap-1.5 text-sm font-medium text-blue-700 dark:text-blue-300">
                        <span>✓</span>
                        <span>Your item is ready — our team will contact you soon.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
