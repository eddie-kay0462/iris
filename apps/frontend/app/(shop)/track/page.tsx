"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Package, Truck, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { trackOrderByEmail, type TrackingOrder } from "@/lib/api/orders";

const STATUS_STEPS: { key: string; label: string }[] = [
  { key: "pending", label: "Order Placed" },
  { key: "paid", label: "Payment Confirmed" },
  { key: "processing", label: "Processing" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
];

function stepIndex(status: string): number {
  const map: Record<string, number> = {
    pending: 0,
    paid: 1,
    processing: 2,
    shipped: 3,
    delivered: 4,
  };
  return map[status] ?? 0;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    delivered: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    shipped: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    processing: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    paid: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    pending: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };
  const labels: Record<string, string> = {
    delivered: "Delivered",
    shipped: "Shipped",
    processing: "Processing",
    paid: "Paid",
    pending: "Pending",
    cancelled: "Cancelled",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${styles[status] ?? styles.pending}`}
    >
      {labels[status] ?? status}
    </span>
  );
}

function OrderResult({ order }: { order: TrackingOrder }) {
  const current = stepIndex(order.status);
  const shippedDate = order.shipped_at
    ? new Date(order.shipped_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : null;
  const deliveredDate = order.delivered_at
    ? new Date(order.delivered_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : null;
  const placedDate = new Date(order.created_at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Order</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{order.order_number}</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Placed {placedDate}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Progress tracker */}
      {order.status !== "cancelled" && (
        <div className="relative">
          <div className="flex items-center justify-between">
            {STATUS_STEPS.map((step, i) => {
              const done = i <= current;
              const active = i === current;
              return (
                <div key={step.key} className="flex flex-1 flex-col items-center">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors ${
                      done
                        ? "border-black bg-black dark:border-white dark:bg-white"
                        : "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-900"
                    }`}
                  >
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 text-white dark:text-black" />
                    ) : (
                      <div className="h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-600" />
                    )}
                  </div>
                  <p
                    className={`mt-2 text-center text-xs ${
                      active
                        ? "font-semibold text-gray-900 dark:text-white"
                        : done
                        ? "text-gray-600 dark:text-gray-400"
                        : "text-gray-400 dark:text-gray-600"
                    }`}
                  >
                    {step.label}
                  </p>
                  {i < STATUS_STEPS.length - 1 && (
                    <div
                      className={`absolute top-4 h-0.5 transition-colors ${
                        i < current ? "bg-black dark:bg-white" : "bg-gray-200 dark:bg-gray-700"
                      }`}
                      style={{
                        left: `${(i + 0.5) * (100 / STATUS_STEPS.length)}%`,
                        width: `${100 / STATUS_STEPS.length}%`,
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Shipping info */}
      {(order.tracking_number || order.carrier) && (
        <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <Truck className="h-4 w-4 text-gray-500" />
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Shipping Details</p>
          </div>
          {order.carrier && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Carrier: <span className="font-medium text-gray-900 dark:text-white">{order.carrier}</span>
            </p>
          )}
          {order.tracking_number && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Tracking: <span className="font-medium text-gray-900 dark:text-white">{order.tracking_number}</span>
            </p>
          )}
          {shippedDate && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Shipped: <span className="font-medium text-gray-900 dark:text-white">{shippedDate}</span>
            </p>
          )}
          {deliveredDate && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Delivered: <span className="font-medium text-gray-900 dark:text-white">{deliveredDate}</span>
            </p>
          )}
        </div>
      )}

      {/* Items */}
      {order.order_items && order.order_items.length > 0 && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <Package className="h-4 w-4 text-gray-500" />
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Items</p>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {order.order_items.map((item, i) => (
              <div key={i} className="flex justify-between px-4 py-3 text-sm">
                <span className="text-gray-700 dark:text-gray-300">
                  {item.product_name}
                  {item.variant_title ? ` — ${item.variant_title}` : ""}
                  {item.quantity > 1 ? ` × ${item.quantity}` : ""}
                </span>
                <span className="text-gray-900 dark:text-white font-medium">
                  GH₵ {item.total_price.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shipping address */}
      {order.shipping_address && (
        <div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Shipping to</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {order.shipping_address.fullName}<br />
            {order.shipping_address.address}<br />
            {order.shipping_address.city}, {order.shipping_address.region}
          </p>
        </div>
      )}

      <Link
        href="/products"
        className="block text-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        Continue shopping
      </Link>
    </div>
  );
}

function TrackContent() {
  const searchParams = useSearchParams();
  const prefillOrder = searchParams.get("order") ?? "";

  const [orderNumber, setOrderNumber] = useState(prefillOrder);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<TrackingOrder | null>(null);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orderNumber.trim() || !email.trim()) return;
    setLoading(true);
    setError("");
    setOrder(null);
    try {
      const result = await trackOrderByEmail(orderNumber.trim(), email.trim());
      setOrder(result);
    } catch {
      setError("We couldn't find an order matching those details. Please check your order number and email address.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <div className="mb-8 text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <Package className="h-7 w-7 text-gray-700 dark:text-gray-300" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Track Your Order</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Enter your order number and the email you used at checkout.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Order number
          </label>
          <input
            type="text"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="e.g. IRD-000001"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:border-white dark:focus:ring-white"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Email address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:border-white dark:focus:ring-white"
            required
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-black px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Looking up order…
            </>
          ) : (
            "Track order"
          )}
        </button>
      </form>

      {order && (
        <div className="mt-10 rounded-xl border border-gray-200 p-6 dark:border-gray-700">
          <OrderResult order={order} />
        </div>
      )}
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg px-4 py-16 text-center text-gray-500 dark:text-gray-400">
          Loading…
        </div>
      }
    >
      <TrackContent />
    </Suspense>
  );
}
