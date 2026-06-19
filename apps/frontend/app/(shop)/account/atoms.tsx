"use client";

import type { ReactNode } from "react";

export type OrderStatus =
  | "pending" | "paid" | "processing" | "shipped"
  | "delivered" | "cancelled" | "stock_held"
  | "fulfilled" | "refunded";

const STATUS_MAP: Record<string, string> = {
  pending: "Pending",
  paid: "Paid",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  stock_held: "Stock Ready",
  fulfilled: "Fulfilled",
  refunded: "Refunded",
};

const DOT_CLASS: Record<string, string> = {
  done:    "bg-[#111] dark:bg-[#ededed]",
  active:  "bg-[#999] dark:bg-neutral-500",
  bad:     "bg-[#ccc] dark:bg-neutral-600",
  pending: "bg-[#ddd] dark:bg-neutral-700",
};

export function StatusPip({ status }: { status: string }) {
  const isDone    = ["delivered", "fulfilled"].includes(status);
  const isActive  = ["shipped", "processing", "stock_held", "paid"].includes(status);
  const isBad     = ["cancelled", "refunded"].includes(status);
  const dotKey    = isDone ? "done" : isActive ? "active" : isBad ? "bad" : "pending";
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.1em] text-[#111] dark:text-[#ededed] whitespace-nowrap font-mono">
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${DOT_CLASS[dotKey]}`} />
      {STATUS_MAP[status] ?? status}
    </span>
  );
}

export function EndLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-center pt-10 pb-4 text-[10px] font-medium uppercase tracking-[0.2em] text-[#ccc] dark:text-neutral-700 font-mono">
      {children}
    </div>
  );
}

/**
 * Returns the pre-optimized Supabase Storage URL.
 * Swaps /originals/ → /optimized/ and replaces the 13-digit timestamp
 * suffix in the filename with 800x800.
 */
export function supabaseImg(url: string | null | undefined): string | null {
  if (!url) return null;
  if (!url.includes("/originals/")) return url;
  return url
    .replace("/originals/", "/optimized/")
    .replace(/__\d{13}(\.[^.]+)$/, "__800x800$1");
}

export function fmt(n: number): string {
  return "GH₵" + n.toLocaleString("en-GH", { minimumFractionDigits: 2 });
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
