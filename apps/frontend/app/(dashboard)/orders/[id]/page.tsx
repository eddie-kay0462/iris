"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import {
  useMyOrder,
  useCancelOrder,
  type OrderStatusHistory,
} from "@/lib/api/orders";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  paid: "bg-blue-100 text-blue-800",
  processing: "bg-indigo-100 text-indigo-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  refunded: "bg-gray-100 text-gray-600",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function CustomerOrderDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { data: order, isLoading, error } = useMyOrder(id);
  const cancelOrder = useCancelOrder();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-100" />
        <div className="h-64 animate-pulse rounded-lg bg-gray-50" />
      </div>
    );
  }

  if (error || !order) {
    return <p className="text-gray-500">Order not found.</p>;
  }

  const canCancel = ["pending", "paid"].includes(order.status);
  const shipping = order.shipping_address;
  const timeline = (order.order_status_history || []).sort(
    (a: OrderStatusHistory, b: OrderStatusHistory) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  async function handleCancel() {
    if (!confirm("Are you sure you want to cancel this order?")) return;
    await cancelOrder.mutateAsync(id);
    router.refresh();
  }

  return (
    <div>
      <button
        onClick={() => router.push("/orders")}
        className="mb-4 text-sm text-gray-500 hover:text-gray-700"
      >
        &larr; Back to orders
      </button>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{order.order_number}</h1>
          <div className="mt-1 flex items-center gap-3">
            <span
              className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                statusColors[order.status] || "bg-gray-100 text-gray-600"
              }`}
            >
              {order.status}
            </span>
            <span className="text-sm text-gray-500">
              {new Date(order.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
        {canCancel && (
          <button
            onClick={handleCancel}
            disabled={cancelOrder.isPending}
            className="rounded border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {cancelOrder.isPending ? "Cancelling..." : "Cancel order"}
          </button>
        )}
      </div>

      {/* Order items */}
      <div className="rounded-lg border border-gray-200 p-4">
        <h2 className="mb-3 font-semibold">Items</h2>
        <div className="space-y-3">
          {(order.order_items || []).map((item: any) => (
            <div
              key={item.id}
              className="flex items-center justify-between text-sm"
            >
              <div>
                <span className="font-medium">{item.product_name}</span>
                {item.variant_title && (
                  <span className="text-gray-500">
                    {" "}
                    ({item.variant_title})
                  </span>
                )}
                <span className="text-gray-500"> x {item.quantity}</span>
              </div>
              <span className="font-medium">
                GH₵{Number(item.total_price).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 font-semibold">
          <span>Total</span>
          <span>GH₵{Number(order.total).toLocaleString()}</span>
        </div>
      </div>

      {/* Shipping address */}
      {shipping && (
        <div className="mt-4 rounded-lg border border-gray-200 p-4">
          <h2 className="mb-3 font-semibold">Shipping Address</h2>
          <div className="space-y-1 text-sm text-gray-600">
            <p>{shipping.fullName}</p>
            <p>{shipping.address}</p>
            {shipping.address2 && <p>{shipping.address2}</p>}
            <p>
              {shipping.city}, {shipping.region}
              {shipping.postalCode ? ` ${shipping.postalCode}` : ""}
            </p>
            <p>{shipping.phone}</p>
          </div>
        </div>
      )}

      {/* Tracking */}
      {order.tracking_number && (
        <div className="mt-4 rounded-lg border border-gray-200 p-4">
          <h2 className="mb-3 font-semibold">Tracking</h2>
          <p className="text-sm">
            {order.carrier && (
              <span className="text-gray-500">{order.carrier}: </span>
            )}
            {order.tracking_number}
          </p>
        </div>
      )}

      {/* Status timeline */}
      {timeline.length > 0 && (
        <div className="mt-4 rounded-lg border border-gray-200 p-4">
          <h2 className="mb-3 font-semibold">Order Timeline</h2>
          <div className="space-y-3">
            {timeline.map((entry: OrderStatusHistory) => (
              <div
                key={entry.id}
                className="flex items-start gap-3 border-l-2 border-gray-200 pl-4"
              >
                <div className="flex-1">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                      statusColors[entry.to_status] ||
                      "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {entry.to_status}
                  </span>
                  {entry.notes && (
                    <p className="mt-1 text-sm text-gray-500">{entry.notes}</p>
                  )}
                </div>
                <span className="whitespace-nowrap text-xs text-gray-400">
                  {new Date(entry.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
