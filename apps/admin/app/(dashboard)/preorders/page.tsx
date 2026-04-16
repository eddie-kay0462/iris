"use client";

import { useState } from "react";
import { MoreHorizontal, Package, RefreshCw, X } from "lucide-react";
import {
  usePreorderStats,
  usePreorders,
  useCancelPreorder,
  useRestockPreorder,
  useRefundPreorder,
  type Preorder,
  type PreorderStatus,
} from "@/lib/api/preorders";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(n: number) {
  return `GH₵ ${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const STATUS_TABS: { label: string; value: string }[] = [
  { label: "All", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Stock Held", value: "stock_held" },
  { label: "Fulfilled", value: "fulfilled" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Refunded", value: "refunded" },
];

function StatusBadge({ status }: { status: PreorderStatus }) {
  const map: Record<PreorderStatus, string> = {
    pending:    "bg-yellow-100 text-yellow-800",
    stock_held: "bg-blue-100 text-blue-800",
    fulfilled:  "bg-green-100 text-green-800",
    cancelled:  "bg-slate-100 text-slate-600",
    refunded:   "bg-red-100 text-red-800",
  };
  const label: Record<PreorderStatus, string> = {
    pending:    "Pending",
    stock_held: "Stock Held",
    fulfilled:  "Fulfilled",
    cancelled:  "Cancelled",
    refunded:   "Refunded",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${map[status]}`}>
      {label[status]}
    </span>
  );
}

function SourceBadge({ source }: { source: "online" | "popup" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        source === "popup" ? "bg-purple-100 text-purple-700" : "bg-sky-100 text-sky-700"
      }`}
    >
      {source === "popup" ? "Pop-up" : "Online"}
    </span>
  );
}

// ─── Restock Modal ────────────────────────────────────────────────────────────

function RestockModal({
  preorder,
  onClose,
}: {
  preorder: Preorder;
  onClose: () => void;
}) {
  const [qty, setQty] = useState(1);
  const [result, setResult] = useState<{ preorders_held: number; remaining_stock: number } | null>(null);
  const restock = useRestockPreorder();

  async function handleRestock() {
    const res = await restock.mutateAsync({ variantId: preorder.variant_id, quantity: qty });
    setResult(res);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-sm font-semibold text-slate-900">Restock Variant</h3>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="text-sm font-medium text-slate-700">{preorder.product_name}</p>
            {preorder.variant_title && (
              <p className="text-xs text-slate-500 mt-0.5">{preorder.variant_title}</p>
            )}
          </div>

          {result ? (
            <div className="rounded-lg bg-green-50 border border-green-200 p-4 space-y-1">
              <p className="text-sm font-semibold text-green-800">Restock successful</p>
              <p className="text-xs text-green-700">{result.preorders_held} preorder{result.preorders_held !== 1 ? "s" : ""} moved to <strong>Stock Held</strong></p>
              <p className="text-xs text-green-700">{result.remaining_stock} units remaining in inventory</p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Units to Add</label>
                <input
                  type="number" min={1} value={qty}
                  onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
                  className="w-28 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Oldest pending preorders will be allocated first (FIFO). SMS notifications sent automatically.
                </p>
              </div>
              <button
                onClick={handleRestock}
                disabled={restock.isPending}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${restock.isPending ? "animate-spin" : ""}`} />
                {restock.isPending ? "Restocking..." : "Restock & Allocate"}
              </button>
            </>
          )}
        </div>
        {result && (
          <div className="border-t border-slate-100 px-5 py-3">
            <button onClick={onClose} className="w-full rounded-lg border border-slate-200 py-2 text-sm text-slate-600 hover:bg-slate-50">
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Refund Modal ─────────────────────────────────────────────────────────────

function RefundModal({ preorder, onClose }: { preorder: Preorder; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [done, setDone] = useState(false);
  const refund = useRefundPreorder();

  const fullAmount = Number(preorder.unit_price) * preorder.quantity;

  async function handleRefund() {
    await refund.mutateAsync({ id: preorder.id, reason: reason || undefined });
    setDone(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-sm font-semibold text-slate-900">Refund Preorder</h3>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {done ? (
            <div className="rounded-lg bg-green-50 border border-green-200 p-4">
              <p className="text-sm font-semibold text-green-800">Refund processed</p>
              <p className="text-xs text-green-700 mt-0.5">Customer notified via SMS if phone was on file.</p>
            </div>
          ) : (
            <>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-1">
                <p className="text-xs text-slate-500">{preorder.order_number} — {preorder.product_name}</p>
                <p className="text-sm font-semibold text-slate-900">{formatCurrency(fullAmount)}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Reason (optional)</label>
                <input
                  type="text" value={reason} onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Customer request"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                />
              </div>
              {refund.error && (
                <p className="text-xs text-red-600">{String((refund.error as any)?.message ?? refund.error)}</p>
              )}
              <button
                onClick={handleRefund}
                disabled={refund.isPending}
                className="w-full rounded-lg bg-red-600 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {refund.isPending ? "Processing..." : `Refund ${formatCurrency(fullAmount)}`}
              </button>
            </>
          )}
        </div>
        {done && (
          <div className="border-t border-slate-100 px-5 py-3">
            <button onClick={onClose} className="w-full rounded-lg border border-slate-200 py-2 text-sm text-slate-600 hover:bg-slate-50">
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Actions Menu ─────────────────────────────────────────────────────────────

function ActionsMenu({
  preorder,
  onRestock,
  onRefund,
}: {
  preorder: Preorder;
  onRestock: () => void;
  onRefund: () => void;
}) {
  const [open, setOpen] = useState(false);
  const cancel = useCancelPreorder();
  const canCancel = ["pending", "stock_held"].includes(preorder.status);
  const canRefund = ["pending", "stock_held"].includes(preorder.status);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-slate-200 bg-white shadow-lg py-1">
            <button
              onClick={() => { setOpen(false); onRestock(); }}
              className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              Restock & Allocate
            </button>
            {canRefund && (
              <button
                onClick={() => { setOpen(false); onRefund(); }}
                className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
              >
                Refund
              </button>
            )}
            {canCancel && (
              <button
                onClick={async () => {
                  setOpen(false);
                  if (confirm(`Cancel preorder ${preorder.order_number}?`)) {
                    await cancel.mutateAsync(preorder.id);
                  }
                }}
                className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PreordersPage() {
  const [statusTab, setStatusTab] = useState("");
  const [restockTarget, setRestockTarget] = useState<Preorder | null>(null);
  const [refundTarget, setRefundTarget] = useState<Preorder | null>(null);

  const { data: stats } = usePreorderStats();
  const { data: result, isLoading } = usePreorders({ status: statusTab || undefined });
  const preorders = result?.data ?? [];

  const statCards = [
    { label: "Pending", value: stats?.pending ?? 0 },
    { label: "Stock Held", value: stats?.stock_held ?? 0 },
    { label: "Fulfilled", value: stats?.fulfilled ?? 0 },
    { label: "Total Value", value: formatCurrency(stats?.totalValue ?? 0) },
  ];

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Preorders</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage customer pre-orders, allocate stock, and process refunds.
        </p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statCards.map((c) => (
          <div key={c.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{c.label}</p>
            <p className="mt-1.5 text-2xl font-semibold text-slate-900">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setStatusTab(t.value)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              statusTab === t.value
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {["Order #", "Customer", "Product / Variant", "Qty", "Value", "Source", "Status", "Date", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-400">
                    Loading...
                  </td>
                </tr>
              ) : preorders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <Package className="mx-auto mb-3 h-8 w-8 text-slate-200" />
                    <p className="text-sm text-slate-400">No preorders found</p>
                  </td>
                </tr>
              ) : (
                preorders.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-slate-700">{p.order_number}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{p.customer_name ?? "—"}</p>
                      {p.customer_phone && <p className="text-xs text-slate-400">{p.customer_phone}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{p.product_name}</p>
                      {p.variant_title && <p className="text-xs text-slate-400">{p.variant_title}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{p.quantity}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {formatCurrency(Number(p.unit_price) * p.quantity)}
                    </td>
                    <td className="px-4 py-3">
                      <SourceBadge source={p.source} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {new Date(p.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3">
                      <ActionsMenu
                        preorder={p}
                        onRestock={() => setRestockTarget(p)}
                        onRefund={() => setRefundTarget(p)}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {restockTarget && (
        <RestockModal preorder={restockTarget} onClose={() => setRestockTarget(null)} />
      )}
      {refundTarget && (
        <RefundModal preorder={refundTarget} onClose={() => setRefundTarget(null)} />
      )}
    </section>
  );
}
