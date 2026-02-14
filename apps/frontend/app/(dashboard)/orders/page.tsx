"use client";

import { useState } from "react";
import Link from "next/link";
import { useMyOrders } from "@/lib/api/orders";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  paid: "bg-blue-100 text-blue-800",
  processing: "bg-indigo-100 text-indigo-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  refunded: "bg-gray-100 text-gray-600",
};

export default function CustomerOrdersPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useMyOrders({ page });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">My Orders</h1>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-lg bg-gray-100"
            />
          ))}
        </div>
      ) : !data || data.data.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-gray-500">You haven&apos;t placed any orders yet.</p>
          <Link
            href="/products"
            className="mt-4 inline-block rounded-lg bg-black px-6 py-2 text-sm font-semibold text-white"
          >
            Start shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {data.data.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="flex items-center justify-between rounded-lg border border-gray-200 p-4 transition hover:bg-gray-50"
            >
              <div>
                <p className="font-medium">{order.order_number}</p>
                <p className="text-sm text-gray-500">
                  {new Date(order.created_at).toLocaleDateString()}
                  {" · "}
                  {(order.order_items || []).length} item
                  {(order.order_items || []).length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                    statusColors[order.status] || "bg-gray-100 text-gray-600"
                  }`}
                >
                  {order.status}
                </span>
                <span className="font-medium">
                  GH₵{Number(order.total).toLocaleString()}
                </span>
              </div>
            </Link>
          ))}

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 text-sm">
              <span className="text-gray-500">
                Page {data.page} of {data.totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded border border-gray-200 px-3 py-1 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= data.totalPages}
                  className="rounded border border-gray-200 px-3 py-1 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
