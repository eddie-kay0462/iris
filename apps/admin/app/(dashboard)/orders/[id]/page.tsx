"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useAdminOrder,
  useUpdateOrderStatus,
  type OrderStatusHistory,
} from "@/lib/api/orders";
import type { Preorder } from "@/lib/api/preorders";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { StatusBadge } from "../../../components/StatusBadge";
import {
  PreorderStatusBadge,
  PreorderSourceBadge,
  RestockModal,
  RefundModal,
  ResendConfirmationModal,
  PreorderActionsMenu,
} from "../../../components/preorders/PreorderControls";

const STATUS_OPTIONS = [
  "pending",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
];

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function AdminOrderDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { data: order, isLoading, error } = useAdminOrder(id);
  const updateStatus = useUpdateOrderStatus();
  const [newStatus, setNewStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("");
  const [restockTarget, setRestockTarget] = useState<Preorder | null>(null);
  const [refundTarget, setRefundTarget] = useState<Preorder | null>(null);
  const [resendTarget, setResendTarget] = useState<Preorder | null>(null);

  if (isLoading) {
    return (
      <section className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        <div className="h-64 animate-pulse rounded-lg bg-slate-100" />
      </section>
    );
  }

  if (error || !order) {
    return (
      <section className="space-y-6">
        <p className="text-slate-500">Order not found.</p>
      </section>
    );
  }

  async function handleUpdateStatus() {
    if (!newStatus) return;
    await updateStatus.mutateAsync({
      orderId: id,
      status: newStatus,
      notes: notes || undefined,
      trackingNumber: trackingNumber || undefined,
      carrier: carrier || undefined,
    });
    setNewStatus("");
    setNotes("");
    setTrackingNumber("");
    setCarrier("");
  }

  const shipping = order.shipping_address;
  const preorders = order.preorders || [];
  const isPopup = order.is_popup_preorder === true;
  const timeline = (order.order_status_history || []).sort(
    (a: OrderStatusHistory, b: OrderStatusHistory) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return (
    <section className="space-y-6">
      <Link href="/orders" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to orders
      </Link>
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{order.order_number}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            {isPopup ? (
              <PreorderStatusBadge status={order.status as Preorder["status"]} />
            ) : (
              <StatusBadge status={order.status} />
            )}
            {isPopup ? (
              <span className="inline-flex items-center gap-1.5">
                <PreorderSourceBadge source="popup" />
                <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                  Pre-order
                </span>
              </span>
            ) : (
              order.contains_preorders && (
                <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                  Contains pre-orders
                </span>
              )
            )}
            <span className="text-sm text-slate-500">
              {new Date(order.created_at).toLocaleString()}
            </span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Order items */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border border-slate-200 p-4">
            <h2 className="mb-3 font-semibold">Items</h2>
            {preorders.length > 0 && (
              <p className="mb-3 rounded-md border-l-2 border-purple-300 bg-purple-50 px-3 py-2 text-xs text-purple-800">
                This order includes pre-order items — not yet in stock. They ship
                separately once restocked. Use the row menu to allocate stock,
                fulfill, refund, or notify the customer.
              </p>
            )}
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="pb-2">Product</th>
                  <th className="pb-2">Qty</th>
                  <th className="pb-2 text-right">Unit Price</th>
                  <th className="pb-2 text-right">Total</th>
                  {preorders.length > 0 && <th className="pb-2" />}
                </tr>
              </thead>
              <tbody>
                {(order.order_items || []).map((item: any) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="py-2">
                      {item.product_name}
                      {item.variant_title && (
                        <span className="text-slate-400">
                          {" "}
                          ({item.variant_title})
                        </span>
                      )}
                    </td>
                    <td className="py-2">{item.quantity}</td>
                    <td className="py-2 text-right">
                      GH₵{Number(item.unit_price).toLocaleString()}
                    </td>
                    <td className="py-2 text-right">
                      GH₵{Number(item.total_price).toLocaleString()}
                    </td>
                    {preorders.length > 0 && <td />}
                  </tr>
                ))}
                {preorders.map((pre) => (
                  <tr key={pre.id} className="border-t border-slate-100 bg-purple-50/40">
                    <td className="py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span>{pre.product_name}</span>
                        {pre.variant_title && (
                          <span className="text-slate-400">({pre.variant_title})</span>
                        )}
                        <PreorderStatusBadge status={pre.status} />
                        <PreorderSourceBadge source={pre.source} />
                      </div>
                    </td>
                    <td className="py-2">{pre.quantity}</td>
                    <td className="py-2 text-right">
                      GH₵{Number(pre.unit_price).toLocaleString()}
                    </td>
                    <td className="py-2 text-right">
                      GH₵{(Number(pre.unit_price) * pre.quantity).toLocaleString()}
                    </td>
                    <td className="py-2 text-right">
                      <PreorderActionsMenu
                        preorder={pre}
                        onRestock={() => setRestockTarget(pre)}
                        onRefund={() => setRefundTarget(pre)}
                        onResendConfirmation={() => setResendTarget(pre)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-slate-200 font-semibold">
                <tr>
                  <td colSpan={3} className="py-2 text-right">
                    Total
                  </td>
                  <td className="py-2 text-right">
                    GH₵{Number(order.total).toLocaleString()}
                  </td>
                  {preorders.length > 0 && <td />}
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Status update — only for real orders (popup groups have no orders row) */}
          {!isPopup && (
          <div className="rounded-lg border border-slate-200 p-4">
            <h2 className="mb-3 font-semibold">Update Status</h2>
            <div className="space-y-3">
              <div className="flex gap-3">
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="flex-1 rounded border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">Select status...</option>
                  {STATUS_OPTIONS.filter((s) => s !== order.status).map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleUpdateStatus}
                  disabled={!newStatus || updateStatus.isPending}
                  className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {updateStatus.isPending ? "Updating..." : "Update"}
                </button>
              </div>

              {(newStatus === "shipped" || newStatus === "delivered") && (
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Tracking number"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    className="rounded border border-slate-200 px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Carrier"
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    className="rounded border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
              )}

              <input
                type="text"
                placeholder="Notes (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
          )}

          {/* Status timeline */}
          {timeline.length > 0 && (
            <div className="rounded-lg border border-slate-200 p-4">
              <h2 className="mb-3 font-semibold">Status History</h2>
              <div className="space-y-3">
                {timeline.map((entry: OrderStatusHistory) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 border-l-2 border-slate-200 pl-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {entry.from_status && (
                          <>
                            <StatusBadge status={entry.from_status} />
                            <span className="text-slate-400">&rarr;</span>
                          </>
                        )}
                        <StatusBadge status={entry.to_status} />
                      </div>
                      {entry.notes && (
                        <p className="mt-1 text-sm text-slate-500">
                          {entry.notes}
                        </p>
                      )}
                    </div>
                    <span className="whitespace-nowrap text-xs text-slate-400">
                      {new Date(entry.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Summary */}
          <div className="rounded-lg border border-slate-200 p-4">
            <h2 className="mb-3 font-semibold">Summary</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Subtotal</dt>
                <dd>GH₵{Number(order.subtotal).toLocaleString()}</dd>
              </div>
              {Number(order.discount) > 0 && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">Discount</dt>
                  <dd>-GH₵{Number(order.discount).toLocaleString()}</dd>
                </div>
              )}
              {Number(order.shipping_cost) > 0 && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">Shipping</dt>
                  <dd>GH₵{Number(order.shipping_cost).toLocaleString()}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-100 pt-2 font-semibold">
                <dt>Total</dt>
                <dd>GH₵{Number(order.total).toLocaleString()}</dd>
              </div>
            </dl>
          </div>

          {/* Customer */}
          <div className="rounded-lg border border-slate-200 p-4">
            <h2 className="mb-3 font-semibold">Customer</h2>
            {order.customer_name && (
              <p className="text-sm font-medium">{order.customer_name}</p>
            )}
            {order.email && <p className="text-sm">{order.email}</p>}
            {isPopup && preorders[0]?.customer_phone && (
              <p className="text-sm text-slate-600">{preorders[0].customer_phone}</p>
            )}
            {order.payment_reference && (
              <p className="mt-1 text-xs text-slate-400">
                Ref: {order.payment_reference}
              </p>
            )}
          </div>

          {/* Shipping */}
          {shipping && (
            <div className="rounded-lg border border-slate-200 p-4">
              <h2 className="mb-3 font-semibold">Shipping Address</h2>
              <div className="space-y-1 text-sm text-slate-600">
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
            <div className="rounded-lg border border-slate-200 p-4">
              <h2 className="mb-3 font-semibold">Tracking</h2>
              <p className="text-sm">
                {order.carrier && (
                  <span className="text-slate-500">{order.carrier}: </span>
                )}
                {order.tracking_number}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Pre-order action modals */}
      {restockTarget && (
        <RestockModal preorder={restockTarget} onClose={() => setRestockTarget(null)} />
      )}
      {refundTarget && (
        <RefundModal preorder={refundTarget} onClose={() => setRefundTarget(null)} />
      )}
      {resendTarget && (
        <ResendConfirmationModal preorder={resendTarget} onClose={() => setResendTarget(null)} />
      )}
    </section>
  );
}
