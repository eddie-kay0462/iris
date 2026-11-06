"use client";

import type { ReactNode } from "react";
import { toast } from "sonner";
import { Modal } from "./v2/Modal";
import { StatusBadge } from "./StatusBadge";
import { paymentMethodLabel } from "@/lib/payment-methods";
import { useRefundWalkinOrder, useWalkinOrder, type WalkinOrder } from "@/lib/api/walkin-sales";

const GHS = (n: number) =>
  `GH₵${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-[var(--iris-muted)]">{label}</span>
      <span className="min-w-0 text-right text-slate-900 [overflow-wrap:anywhere]">{children}</span>
    </div>
  );
}

/**
 * One walk-in sale, opened in place from the Walk-in Sales list or the main
 * Orders list. Loads by id so it shows the latest state (e.g. after a refund
 * elsewhere); `initial` is shown meanwhile when the caller already has the row.
 */
export function WalkinOrderModal({
  orderId,
  initial,
  onClose,
}: {
  orderId: string | null;
  initial?: WalkinOrder | null;
  onClose: () => void;
}) {
  const { data, isLoading, isError } = useWalkinOrder(orderId);
  const order = data ?? initial ?? null;
  const refund = useRefundWalkinOrder();

  async function handleRefund() {
    if (!order) return;
    if (!confirm(`Refund ${order.order_number} in full and restore stock?`)) return;
    try {
      await refund.mutateAsync({ id: order.id, dto: {} });
      toast.success("Order refunded and stock restored.");
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Failed to refund.");
    }
  }

  const servedBy = order?.profiles
    ? [order.profiles.first_name, order.profiles.last_name].filter(Boolean).join(" ")
    : "";
  const hasDiscount = !!order && Number(order.discount_amount) > 0;

  return (
    <Modal
      open={!!orderId}
      onClose={onClose}
      title={order?.order_number ?? "Walk-in sale"}
      description={
        order
          ? new Date(order.created_at).toLocaleString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : undefined
      }
      footer={
        order?.status === "completed" ? (
          <button
            type="button"
            onClick={handleRefund}
            disabled={refund.isPending}
            className="rounded-full border border-[var(--iris-danger-fg)] px-4 py-2 text-xs font-medium text-[var(--iris-danger-fg)] transition-colors hover:bg-[var(--iris-danger-bg)] disabled:opacity-50"
          >
            {refund.isPending ? "Processing…" : "Refund & restore stock"}
          </button>
        ) : undefined
      }
    >
      {!order ? (
        <p className="py-6 text-center text-sm text-[var(--iris-muted)]">
          {isLoading ? "Loading…" : isError ? "Couldn't load this sale." : "Sale not found."}
        </p>
      ) : (
        <div className="space-y-4 text-sm">
          <div className="space-y-2">
            <Row label="Status"><StatusBadge status={order.status} /></Row>
            <Row label="Customer">{order.customer_name || "Walk-in customer"}</Row>
            <Row label="Contact">{order.customer_phone || order.customer_email || "—"}</Row>
            <Row label="Payment">{paymentMethodLabel(order.payment_method)}</Row>
            {order.payment_reference && (
              <Row label="Reference"><span className="font-mono text-xs">{order.payment_reference}</span></Row>
            )}
            {servedBy && <Row label="Served by">{servedBy}</Row>}
          </div>

          <div className="overflow-hidden rounded-xl border border-[var(--iris-line)]">
            {(order.walkin_order_items || []).length === 0 ? (
              <p className="px-3 py-3 text-[var(--iris-muted)]">No items recorded.</p>
            ) : (
              (order.walkin_order_items || []).map((i) => (
                <div
                  key={i.id}
                  className="flex items-start justify-between gap-3 border-b border-[var(--iris-line)] px-3 py-2.5 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="text-slate-900">
                      {i.product_name} <span className="text-[var(--iris-muted)]">×{i.quantity}</span>
                    </p>
                    {i.variant_title && <p className="text-xs text-[var(--iris-muted)]">{i.variant_title}</p>}
                  </div>
                  <span className="shrink-0 tabular-nums text-slate-900">{GHS(i.total_price)}</span>
                </div>
              ))
            )}
          </div>

          <div className="space-y-1.5">
            {hasDiscount && (
              <>
                <Row label="Subtotal"><span className="tabular-nums">{GHS(order.subtotal)}</span></Row>
                <Row label={order.discount_reason ? `Discount · ${order.discount_reason}` : "Discount"}>
                  <span className="tabular-nums">−{GHS(order.discount_amount)}</span>
                </Row>
              </>
            )}
            <div className="flex justify-between text-base font-semibold text-slate-900">
              <span>Total</span>
              <span className="tabular-nums">{GHS(order.total)}</span>
            </div>
          </div>

          {order.notes && (
            <div className="rounded-xl bg-[var(--iris-hover)] px-3 py-2.5">
              <p className="mb-0.5 text-xs text-[var(--iris-muted)]">Notes</p>
              <p className="whitespace-pre-wrap text-slate-900">{order.notes}</p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
