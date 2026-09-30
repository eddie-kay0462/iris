"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { formatGHS } from "@/lib/charts/theme";
import {
  B2B_STATUS_TRANSITIONS,
  useUpdateB2bOrderStatus,
  type B2bOrder,
  type B2bStatus,
} from "@/lib/api/b2b";

/** Button wording for each move. Forward moves are primary; the rest step back. */
function actionFor(from: B2bStatus, to: B2bStatus): { label: string; primary: boolean; danger?: boolean } {
  switch (to) {
    case "confirmed":
      return from === "draft"
        ? { label: "Confirm order", primary: true }
        : { label: "Back to confirmed", primary: false };
    case "in_production":
      return from === "completed"
        ? { label: "Reopen", primary: false }
        : { label: "Start production", primary: true };
    case "completed":
      return { label: "Mark complete", primary: true };
    case "cancelled":
      return { label: "Cancel order", primary: false, danger: true };
    case "draft":
      return from === "cancelled"
        ? { label: "Restore as draft", primary: false }
        : { label: "Back to draft", primary: false };
  }
}

const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function StatusActions({ order }: { order: B2bOrder }) {
  const mutation = useUpdateB2bOrderStatus();
  const [confirming, setConfirming] = useState<B2bStatus | null>(null);
  const [completedOn, setCompletedOn] = useState(todayLocal());

  const moves = B2B_STATUS_TRANSITIONS[order.status];

  async function apply(to: B2bStatus) {
    let completed_at: string | undefined;
    if (to === "completed" && completedOn !== todayLocal()) {
      // A backdated completion lands at midday so it sits squarely on that day.
      completed_at = `${completedOn}T12:00:00.000Z`;
    }
    try {
      await mutation.mutateAsync({ id: order.id, status: to, completed_at });
      toast.success(
        to === "completed"
          ? `${order.order_number} completed. Revenue and units now count.`
          : `${order.order_number} updated.`,
      );
      setConfirming(null);
    } catch (err: any) {
      toast.error(err?.message ?? "Could not update the order.", { duration: 6000 });
    }
  }

  /** Moves that change what counts toward revenue get a confirmation step. */
  function onClick(to: B2bStatus) {
    if (to === "completed" || to === "cancelled" || order.status === "completed") {
      setCompletedOn(todayLocal());
      setConfirming(to);
    } else {
      apply(to);
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {moves.map((to) => {
          const a = actionFor(order.status, to);
          return (
            <button
              key={to}
              onClick={() => onClick(to)}
              disabled={mutation.isPending}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                a.primary
                  ? "bg-slate-900 text-white hover:bg-slate-800"
                  : a.danger
                  ? "border border-red-200 text-red-600 hover:bg-red-50"
                  : "border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {a.label}
            </button>
          );
        })}
      </div>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-base font-semibold text-slate-900">
                {actionFor(order.status, confirming).label}
              </h3>
              <button onClick={() => setConfirming(null)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 p-6 text-sm text-slate-600">
              {confirming === "completed" && (
                <>
                  <p>
                    This adds <span className="font-semibold text-slate-900">{formatGHS(order.revenue)}</span> to
                    B2B revenue and{" "}
                    <span className="font-semibold text-slate-900">{order.units.toLocaleString()} units</span> to
                    Road to HQ.
                  </p>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Completed on</label>
                    <input
                      type="date"
                      value={completedOn}
                      max={todayLocal()}
                      onChange={(e) => setCompletedOn(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                    />
                    <p className="mt-1 text-xs text-slate-400">
                      Pick an earlier date if the order was delivered in the past.
                    </p>
                  </div>
                </>
              )}
              {confirming === "cancelled" && (
                <p>Cancel {order.order_number}? It stays on record but no longer counts as pipeline.</p>
              )}
              {order.status === "completed" && (
                <p>
                  Reopening takes <span className="font-semibold text-slate-900">{formatGHS(order.revenue)}</span> and{" "}
                  {order.units.toLocaleString()} units back out of revenue and Road to HQ until it is completed again.
                </p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setConfirming(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  onClick={() => apply(confirming)}
                  disabled={mutation.isPending || (confirming === "completed" && !completedOn)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                    confirming === "cancelled" ? "bg-red-600 hover:bg-red-700" : "bg-slate-900 hover:bg-slate-800"
                  }`}
                >
                  {mutation.isPending ? "Saving…" : actionFor(order.status, confirming).label}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
