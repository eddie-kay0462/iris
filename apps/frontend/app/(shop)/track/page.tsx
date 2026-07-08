"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  trackOrderByEmail,
  type TrackingResult,
  type TrackingOrder,
  type TrackingPreorder,
} from "@/lib/api/orders";
import { StatusPip, EndLabel, fmt, fmtDate } from "../account/atoms";

const STATUS_STEPS: { key: string; label: string }[] = [
  { key: "pending", label: "Placed" },
  { key: "paid", label: "Paid" },
  { key: "processing", label: "Processing" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
];

// Preorders have their own status flow: reserved → stock held → fulfilled.
const PREORDER_STEPS: { key: string; label: string }[] = [
  { key: "pending", label: "Reserved" },
  { key: "stock_held", label: "Stock Held" },
  { key: "fulfilled", label: "Fulfilled" },
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

function preorderStepIndex(status: string): number {
  const map: Record<string, number> = {
    pending: 0,
    stock_held: 1,
    fulfilled: 2,
  };
  return map[status] ?? 0;
}

const sectionLabelCls =
  "text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999] dark:text-neutral-500 font-mono";

/* ---------- Editorial monochrome progress stepper ---------- */
function Stepper({
  steps,
  current,
}: {
  steps: { key: string; label: string }[];
  current: number;
}) {
  const n = steps.length;
  const inset = 50 / n; // % — half a column; aligns line ends to first/last node centers
  const seg = 100 / n; // % — distance between adjacent node centers
  const progressW = Math.max(0, Math.min(current, n - 1)) * seg;

  return (
    <div className="relative">
      {/* Base track — continuous light line linking every milestone */}
      <div
        className="pointer-events-none absolute top-1.5 h-px -translate-y-1/2 bg-[#d4d4d4] dark:bg-neutral-700"
        style={{ left: `${inset}%`, right: `${inset}%` }}
      />
      {/* Progress overlay — solid up to the current milestone */}
      <div
        className="pointer-events-none absolute top-1.5 h-px -translate-y-1/2 bg-[#111] dark:bg-[#ededed]"
        style={{ left: `${inset}%`, width: `${progressW}%` }}
      />

      {/* Nodes + labels */}
      <div className="relative flex">
        {steps.map((step, i) => {
          const done = i <= current;
          const active = i === current;
          return (
            <div key={step.key} className="flex flex-1 flex-col items-center">
              <div
                className={`relative z-10 flex h-3 w-3 flex-shrink-0 items-center justify-center rounded-full border transition-colors ${
                  done
                    ? "border-[#111] bg-[#111] dark:border-[#ededed] dark:bg-[#ededed]"
                    : "border-[#ddd] bg-white dark:border-neutral-700 dark:bg-[#0a0a0a]"
                } ${active ? "ring-2 ring-[#111]/15 dark:ring-white/20" : ""}`}
              />
              <p
                className={`mt-2.5 text-center text-[9px] font-medium uppercase tracking-[0.1em] font-mono ${
                  active
                    ? "text-[#111] dark:text-[#ededed]"
                    : done
                    ? "text-[#999] dark:text-neutral-500"
                    : "text-[#ccc] dark:text-neutral-700"
                }`}
              >
                {step.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Shared item rows ---------- */
function ItemRows({
  items,
}: {
  items: { product_name: string; variant_title: string | null; quantity: number; total_price: number }[];
}) {
  return (
    <div>
      <div className={`${sectionLabelCls} mb-3`}>Items</div>
      <div className="border-t border-[#e5e5e5] dark:border-neutral-800">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-4 border-b border-[#f0f0f0] dark:border-neutral-900 py-3"
          >
            <div className="min-w-0">
              <div className="text-[12px] font-medium uppercase tracking-[0.04em] text-[#111] dark:text-[#ededed] truncate">
                {item.product_name}
              </div>
              <div className="mt-0.5 text-[11px] text-[#999] dark:text-neutral-500">
                {item.variant_title ? `${item.variant_title} · ` : ""}Qty {item.quantity}
              </div>
            </div>
            <div className="text-[12px] font-medium text-[#111] dark:text-[#ededed] whitespace-nowrap">
              {fmt(item.total_price)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OrderResult({ order }: { order: TrackingOrder }) {
  const current = stepIndex(order.status);
  const cancelled = order.status === "cancelled";
  const shippedDate = order.shipped_at ? fmtDate(order.shipped_at) : null;
  const deliveredDate = order.delivered_at ? fmtDate(order.delivered_at) : null;

  return (
    <div className="space-y-9">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className={sectionLabelCls}>Order</div>
          <div className="mt-1.5 text-[20px] font-bold uppercase tracking-[-0.01em] text-[#111] dark:text-[#ededed] leading-none">
            {order.order_number}
          </div>
          <div className="mt-2 text-[11px] text-[#999] dark:text-neutral-500 font-mono">
            Placed {fmtDate(order.created_at)}
          </div>
        </div>
        <StatusPip status={order.status} />
      </div>

      {/* Progress tracker */}
      {!cancelled && (
        <div className="py-6">
          <Stepper steps={STATUS_STEPS} current={current} />
        </div>
      )}

      {/* Shipping info */}
      {(order.tracking_number || order.carrier || shippedDate || deliveredDate) && (
        <div>
          <div className={`${sectionLabelCls} mb-3`}>Shipping</div>
          <div className="border-t border-[#e5e5e5] dark:border-neutral-800">
            {order.carrier && (
              <DetailRow label="Carrier" value={order.carrier} />
            )}
            {order.tracking_number && (
              <DetailRow label="Tracking" value={order.tracking_number} mono />
            )}
            {shippedDate && <DetailRow label="Shipped" value={shippedDate} />}
            {deliveredDate && <DetailRow label="Delivered" value={deliveredDate} />}
          </div>
        </div>
      )}

      {/* Items */}
      {order.order_items && order.order_items.length > 0 && (
        <ItemRows items={order.order_items} />
      )}

      {/* Pre-order items — not in stock yet, ship separately once restocked */}
      {order.preorders && order.preorders.length > 0 && (
        <div className={order.order_items && order.order_items.length > 0 ? "mt-8" : ""}>
          <div className={`${sectionLabelCls} mb-3`}>Pre-order Items</div>
          <div className="mb-3 border-l-2 border-[#111] dark:border-[#ededed] bg-[#f5f5f5] dark:bg-[#111] px-4 py-3 text-[12px] leading-[1.5] text-[#666] dark:text-neutral-400">
            These aren&apos;t in stock yet - they ship separately within 10-15 working days.
            We&apos;ll notify you when they&apos;re on the way.
          </div>
          <div className="border-t border-[#e5e5e5] dark:border-neutral-800">
            {order.preorders.map((pre, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-4 border-b border-[#f0f0f0] dark:border-neutral-900 py-3"
              >
                <div className="min-w-0">
                  <div className="text-[12px] font-medium uppercase tracking-[0.04em] text-[#111] dark:text-[#ededed] truncate">
                    {pre.product_name}
                  </div>
                  <div className="mt-0.5 text-[11px] text-[#999] dark:text-neutral-500">
                    {pre.variant_title ? `${pre.variant_title} · ` : ""}Qty {pre.quantity}
                  </div>
                </div>
                <div className="flex items-center gap-3 whitespace-nowrap">
                  <StatusPip status={pre.status} />
                  <span className="text-[12px] font-medium text-[#111] dark:text-[#ededed]">
                    {fmt(pre.unit_price * pre.quantity)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <br/>
      {/* Shipping address */}
      {order.shipping_address && (
        <div>
          <div className={`${sectionLabelCls} mb-3`}>Shipping to</div>
          <p className="text-[13px] text-[#666] dark:text-neutral-400 leading-relaxed">
            {order.shipping_address.fullName}
            <br />
            {order.shipping_address.address}
            <br />
            {order.shipping_address.city}, {order.shipping_address.region}
          </p>
        </div>
      )}
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#f0f0f0] dark:border-neutral-900 py-2.5">
      <span className="text-[11px] uppercase tracking-[0.1em] text-[#999] dark:text-neutral-500 font-mono">
        {label}
      </span>
      <span
        className={`text-[12px] font-medium text-[#111] dark:text-[#ededed] ${
          mono ? "font-mono tracking-[0.02em]" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function PreorderResult({ preorder }: { preorder: TrackingPreorder }) {
  const current = preorderStepIndex(preorder.status);
  const terminal = preorder.status === "cancelled" || preorder.status === "refunded";

  const note: string | null =
    preorder.status === "pending"
      ? "Your pre-order is reserved. We expect to reach out within 10-15 working days once your item is ready."
      : preorder.status === "stock_held"
      ? "Stock has arrived and is being held for your pre-order. Our team will reach out to arrange delivery."
      : preorder.status === "fulfilled"
      ? "Your pre-order has been fulfilled. Thank you."
      : preorder.status === "cancelled"
      ? "This pre-order has been cancelled."
      : preorder.status === "refunded"
      ? "This pre-order has been refunded."
      : null;

  return (
    <div className="space-y-9">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className={sectionLabelCls}>Pre-order</div>
          <div className="mt-1.5 text-[20px] font-bold uppercase tracking-[-0.01em] text-[#111] dark:text-[#ededed] leading-none">
            {preorder.order_number}
          </div>
          <div className="mt-2 text-[11px] text-[#999] dark:text-neutral-500 font-mono">
            Reserved {fmtDate(preorder.created_at)}
          </div>
        </div>
        <StatusPip status={preorder.status} />
      </div>

      {/* Progress tracker */}
      {!terminal && (
        <div className="py-5">
          <Stepper steps={PREORDER_STEPS} current={current} />
        </div>
      )}

      {/* Status note */}
      {note && (
        <div className="border-l-2 border-[#111] dark:border-[#ededed] bg-[#f5f5f5] dark:bg-[#111] px-4 py-3 text-[12px] leading-[1.5] text-[#666] dark:text-neutral-400">
          {note}
        </div>
      )}

      {/* Items */}
      {preorder.items && preorder.items.length > 0 && (
        <ItemRows items={preorder.items} />
      )}
    </div>
  );
}

function TrackContent() {
  const searchParams = useSearchParams();
  const prefillOrder = searchParams.get("order") ?? "";

  const [orderNumber, setOrderNumber] = useState(prefillOrder);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orderNumber.trim() || !email.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const found = await trackOrderByEmail(orderNumber.trim(), email.trim());
      setResult(found);
    } catch {
      setError(
        "We couldn't find an order matching those details. Please check your order number and email address.",
      );
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "w-full px-3 py-2.5 border border-[#ddd] dark:border-neutral-700 bg-white dark:bg-[#111] text-[13px] text-[#111] dark:text-[#ededed] outline-none transition-colors duration-200 focus:border-[#111] dark:focus:border-white placeholder:text-[#ccc] dark:placeholder:text-neutral-600 box-border rounded-none";
  const labelCls =
    "block text-[11px] font-medium text-[#666] dark:text-neutral-400 mb-1.5 tracking-[0.02em]";

  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:py-20">
      {/* Header */}
      <div className="mb-10">
        <div className={sectionLabelCls}>Order Tracking</div>
        <h1 className="mt-2 text-[28px] font-bold uppercase tracking-[-0.01em] text-[#111] dark:text-[#ededed] leading-none">
          Track Your Order
        </h1>
        <p className="mt-3 text-[13px] text-[#999] dark:text-neutral-500 leading-relaxed">
          Enter your order number and the email you used at checkout.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="orderNumber" className={labelCls}>
            Order number
          </label>
          <input
            id="orderNumber"
            type="text"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="e.g. IRD-001001 or PRE-001001"
            className={inputCls}
            required
          />
        </div>
        <div>
          <label htmlFor="email" className={labelCls}>
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputCls}
            required
          />
        </div>

        {error && (
          <div className="border-l-2 border-[#c00] dark:border-[#ff5f5f] bg-[#fdf2f2] dark:bg-[#2a0f0f] px-4 py-3 text-[12px] leading-[1.5] text-[#c00] dark:text-[#ff8f8f]">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 bg-[#111] dark:bg-white text-white dark:text-[#0a0a0a] text-[11px] font-semibold uppercase tracking-[0.16em] cursor-pointer transition-colors duration-200 hover:bg-[#333] dark:hover:bg-neutral-200 disabled:bg-[#555] dark:disabled:bg-neutral-700 disabled:cursor-not-allowed border-none rounded-none"
        >
          {loading ? "Looking up order…" : "Track order"}
        </button>
      </form>

      {result && (
        <div className="mt-14 border-t border-[#e5e5e5] dark:border-neutral-800 pt-10">
          {result.kind === "preorder" ? (
            <PreorderResult preorder={result} />
          ) : (
            <OrderResult order={result} />
          )}

          <EndLabel>End of {result.kind === "preorder" ? "pre-order" : "order"}</EndLabel>

          <Link
            href="/products"
            className="block w-full bg-white px-6 py-3.5 text-center text-xs font-semibold uppercase tracking-[0.25em] text-black transition hover:bg-white/85"
          >
            Continue shopping
          </Link>
        </div>
      )}
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-xl px-4 py-16 text-center text-[13px] text-[#999] dark:text-neutral-500 font-mono uppercase tracking-[0.1em]">
          Loading…
        </div>
      }
    >
      <TrackContent />
    </Suspense>
  );
}
