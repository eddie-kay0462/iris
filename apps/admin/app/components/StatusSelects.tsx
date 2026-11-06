"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import { useUpdateOrderStatus, type Order } from "@/lib/api/orders";
import {
  useUpdateWalkinOrder,
  useRefundWalkinOrder,
  type WalkinOrderStatus,
} from "@/lib/api/walkin-sales";
import { useUpdatePreorderGroupStatus, type PreorderStatus } from "@/lib/api/preorders";
import {
  GROUP_STATUS_OPTIONS,
  PREORDER_STATUS_LABELS,
  toastGroupStatusResult,
  type GroupStatusTarget,
} from "./preorders/PreorderControls";
import { statusStyle, TONE_CLASSES } from "./v2/StatusPill";

/**
 * Every row in the order lists — online order, walk-in sale, or pre-order group —
 * changes state through the same inline <select>, so the tables read uniformly.
 * The wrappers below only differ in which statuses they offer and which endpoint
 * they hit.
 */

export interface StatusOption {
  value: string;
  label: string;
}

function titleCase(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const ORDER_STATUSES = [
  "pending",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
];

const ORDER_STATUS_OPTIONS: StatusOption[] = ORDER_STATUSES.map((s) => ({
  value: s,
  label: titleCase(s),
}));

const WALKIN_STATUS_LABELS: Record<WalkinOrderStatus, string> = {
  completed: "Completed",
  awaiting_payment: "Awaiting Payment",
  on_hold: "On Hold",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

/**
 * Widest label across every order type ("Awaiting Payment" today), so a walk-in
 * row's dropdown and an online order's dropdown line up in the same column
 * instead of each shrinking to fit its own options.
 */
const WIDEST_STATUS_LABEL = [
  ...ORDER_STATUS_OPTIONS.map((o) => o.label),
  ...Object.values(WALKIN_STATUS_LABELS),
  ...Object.values(PREORDER_STATUS_LABELS),
].reduce((widest, label) => (label.length > widest.length ? label : widest), "");

/** Room for the widest label plus the horizontal padding and the chevron. */
const STATUS_SELECT_MIN_WIDTH = `calc(${WIDEST_STATUS_LABEL.length}ch + 2.5rem)`;

export function StatusSelect({
  value,
  valueLabel,
  options,
  onChange,
  errorMessage,
}: {
  value: string;
  /** Label for the current value when it isn't itself a settable target. */
  valueLabel?: string;
  /** Settable targets. The current value is rendered separately. */
  options: StatusOption[];
  onChange: (next: string) => Promise<void>;
  errorMessage: string;
}) {
  const [pending, setPending] = useState(false);
  const isSettable = options.some((o) => o.value === value);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    e.stopPropagation();
    const next = e.target.value;
    if (!next || next === value) return;
    setPending(true);
    try {
      await onChange(next);
    } catch {
      toast.error(errorMessage, { duration: 6000 });
    } finally {
      setPending(false);
    }
  }

  // The pill (tone colours, rounded ends, focus ring) is the wrapper; the select
  // inside is transparent with its native arrow hidden, and a chevron sits
  // inset from the rounded end. The native arrow otherwise sat flush against
  // the curve, clipped and off-centre.
  return (
    <span
      className={`relative inline-flex items-center rounded-full text-xs font-medium focus-within:ring-2 focus-within:ring-[var(--iris-line)] ${
        pending || options.length === 0 ? "opacity-50" : ""
      } ${TONE_CLASSES[statusStyle(value).tone]}`}
    >
      <select
        value={value}
        onChange={handleChange}
        // DataTable rows are clickable, so the select must not bubble.
        onClick={(e) => e.stopPropagation()}
        disabled={pending || options.length === 0}
        style={{ minWidth: STATUS_SELECT_MIN_WIDTH }}
        className="cursor-pointer appearance-none rounded-full border-0 bg-transparent py-1 pl-3 pr-7 text-inherit outline-none pointer-coarse:py-2 disabled:cursor-not-allowed"
      >
        {!isSettable && (
          <option value={value}>{valueLabel ?? titleCase(value)}</option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 opacity-70"
        strokeWidth={2}
      />
    </span>
  );
}

// ─── Online orders ────────────────────────────────────────────────────────────

export function OrderStatusSelect({ order }: { order: Order }) {
  const updateStatus = useUpdateOrderStatus();

  return (
    <StatusSelect
      value={order.status}
      options={ORDER_STATUS_OPTIONS}
      errorMessage="Failed to update order status."
      onChange={async (next) => {
        await updateStatus.mutateAsync({ orderId: order.id, status: next });
        toast.success(`Order status updated to ${next}.`);
      }}
    />
  );
}

// ─── Walk-in sales ────────────────────────────────────────────────────────────

export interface WalkinStatusTarget {
  id: string;
  order_number: string;
  status: WalkinOrderStatus;
}

export function WalkinStatusSelect({ order }: { order: WalkinStatusTarget }) {
  const updateOrder = useUpdateWalkinOrder();
  const refundOrder = useRefundWalkinOrder();

  // Refunding is only legal from `completed` (the API rejects anything else), and
  // it has to go through the refund endpoint — a plain status PATCH would skip the
  // inventory restore, the payment record, and the customer SMS.
  const options = (Object.keys(WALKIN_STATUS_LABELS) as WalkinOrderStatus[])
    .filter((s) => s !== "refunded" || order.status === "completed")
    .map((s) => ({ value: s, label: WALKIN_STATUS_LABELS[s] }));

  return (
    <StatusSelect
      value={order.status}
      options={options}
      errorMessage="Failed to update walk-in order status."
      onChange={async (next) => {
        const status = next as WalkinOrderStatus;

        if (status === "refunded") {
          if (!confirm(`Refund ${order.order_number} in full and restore its stock?`)) return;
          await refundOrder.mutateAsync({ id: order.id, dto: {} });
          toast.success(`${order.order_number} refunded.`);
          return;
        }

        // Cancelling a completed sale returns its stock and reverts any promo.
        if (status === "cancelled" && order.status === "completed") {
          if (!confirm(`Cancel ${order.order_number} and return its stock to inventory?`)) return;
        }

        await updateOrder.mutateAsync({ id: order.id, dto: { status } });
        toast.success(`Order status updated to ${WALKIN_STATUS_LABELS[status].toLowerCase()}.`);
      }}
    />
  );
}

// ─── Pre-order groups (walk-in / pop-up) ──────────────────────────────────────

export function PreorderGroupStatusSelect({
  orderNumber,
  currentStatus,
}: {
  orderNumber: string;
  currentStatus: PreorderStatus;
}) {
  const updateGroupStatus = useUpdatePreorderGroupStatus();

  // Only these three are settable in bulk; `pending`/`stock_held` are reached via
  // Restock & Allocate on the order detail page.
  const options = GROUP_STATUS_OPTIONS.filter((o) => o.value !== currentStatus);

  return (
    <StatusSelect
      value={currentStatus}
      valueLabel={PREORDER_STATUS_LABELS[currentStatus] ?? currentStatus}
      options={options}
      errorMessage="Failed to update pre-order status."
      onChange={async (next) => {
        const status = next as GroupStatusTarget;
        const result = await updateGroupStatus.mutateAsync({ orderNumber, status });
        toastGroupStatusResult(result, status);
      }}
    />
  );
}
