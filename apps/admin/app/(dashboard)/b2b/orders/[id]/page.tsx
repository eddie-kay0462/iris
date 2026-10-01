"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { useCan } from "@/lib/rbac/RoleContext";
import { useB2bOrder } from "@/lib/api/b2b";
import { B2bStatusBadge } from "../../components/B2bStatusBadge";
import { OrderForm } from "../../components/OrderForm";
import { StatusActions } from "../../components/StatusActions";

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—";

export default function B2bOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const canManage = useCan("b2b:manage");
  const { data: order, isLoading, error } = useB2bOrder(id);

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-lg border border-slate-200 bg-white" />;
  }
  if (error || !order) {
    return (
      <section className="space-y-4">
        <Link href="/b2b" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-4 w-4" />
          B2B
        </Link>
        <p className="text-sm text-slate-500">{error?.message ?? "Order not found."}</p>
      </section>
    );
  }

  const locked = order.status === "completed" || order.status === "cancelled";

  return (
    <section className="space-y-6">
      <header className="space-y-3">
        <Link href="/b2b" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-4 w-4" />
          B2B
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold">{order.order_number}</h1>
              <B2bStatusBadge status={order.status} overdue={order.overdue} />
            </div>
            <p className="text-sm text-slate-500">
              {order.title} ·{" "}
              <Link href={`/b2b/clients/${order.client_id}`} className="font-medium text-slate-700 hover:underline">
                {order.client.name}
              </Link>
            </p>
            <p className="text-xs text-slate-400">
              Created {fmtDate(order.created_at)}
              {order.completed_at && ` · Completed ${fmtDate(order.completed_at)}`}
              {order.cancelled_at && ` · Cancelled ${fmtDate(order.cancelled_at)}`}
            </p>
          </div>
          {canManage && <StatusActions order={order} />}
        </div>
      </header>

      {locked && canManage && (
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <Lock className="h-4 w-4 shrink-0 text-slate-400" />
          {order.status === "completed"
            ? "This order is completed and counts toward revenue. Reopen it to make changes."
            : "This order is cancelled. Restore it as a draft to make changes."}
        </div>
      )}

      {/* Keyed on updated_at so the form picks up a save or status change. */}
      <OrderForm key={order.updated_at} order={order} readOnly={locked || !canManage} />
    </section>
  );
}
