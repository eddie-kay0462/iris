"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, Calendar } from "lucide-react";
import { useAdminCustomer, type Order } from "@/lib/api/orders";
import { StatusBadge } from "../../../components/StatusBadge";

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-lg font-semibold text-slate-600">
      {initials}
    </div>
  );
}

function MiniSparkline({ orders }: { orders: Order[] }) {
  // Build last 6 months of spending
  const monthlySpend = useMemo(() => {
    const now = new Date();
    const months: number[] = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const total = orders
        .filter((o) => {
          if (["cancelled", "refunded"].includes(o.status)) return false;
          const d = new Date(o.created_at);
          return d >= start && d <= end;
        })
        .reduce((sum, o) => sum + Number(o.total), 0);
      months.push(total);
    }
    return months;
  }, [orders]);

  const maxVal = Math.max(...monthlySpend, 1);

  return (
    <div className="flex items-end gap-1 h-8">
      {monthlySpend.map((val, i) => (
        <div
          key={i}
          className="w-3 rounded-sm bg-blue-400 transition-all"
          style={{ height: `${Math.max((val / maxVal) * 100, val > 0 ? 8 : 2)}%` }}
          title={`GH₵${val.toLocaleString()}`}
        />
      ))}
    </div>
  );
}

function OrderTimeline({ orders }: { orders: Order[] }) {
  if (orders.length === 0) {
    return <p className="text-sm text-slate-500">No orders yet.</p>;
  }

  return (
    <div className="relative ml-4">
      {/* Vertical line */}
      <div className="absolute left-0 top-2 bottom-2 w-px bg-slate-200" />

      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="relative pl-6">
            {/* Dot */}
            <div className="absolute left-[-4px] top-3 h-2 w-2 rounded-full bg-slate-400" />

            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <Link
                  href={`/orders/${order.id}`}
                  className="font-medium text-blue-600 hover:underline"
                >
                  {order.order_number}
                </Link>
                <StatusBadge status={order.status} />
              </div>
              <div className="mt-2 flex items-center gap-4 text-sm text-slate-500">
                <span>GH₵{Number(order.total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span>{order.order_items?.length || 0} item{(order.order_items?.length || 0) !== 1 ? "s" : ""}</span>
                <span>{new Date(order.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: customer, isLoading, error } = useAdminCustomer(id);

  if (isLoading) {
    return (
      <section className="space-y-6">
        <div className="h-6 w-48 animate-pulse rounded bg-slate-200" />
        <div className="h-40 animate-pulse rounded-lg bg-slate-100" />
      </section>
    );
  }

  if (error || !customer) {
    return (
      <section className="space-y-4">
        <Link href="/customers" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Back to Customers
        </Link>
        <p className="text-sm text-red-600">Customer not found.</p>
      </section>
    );
  }

  const name = [customer.first_name, customer.last_name].filter(Boolean).join(" ") || "—";

  return (
    <section className="space-y-6">
      <Link href="/customers" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Back to Customers
      </Link>

      {/* Header with avatar */}
      <header className="flex items-center gap-4">
        <Avatar name={name} />
        <div className="space-y-0.5">
          <h1 className="text-2xl font-semibold">{name}</h1>
          <p className="text-sm text-slate-500">{customer.email}</p>
        </div>
      </header>

      {/* Profile info */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Mail className="h-3.5 w-3.5" /> Email
          </div>
          <p className="mt-1 text-sm font-medium text-slate-900">{customer.email}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Phone className="h-3.5 w-3.5" /> Phone
          </div>
          <p className="mt-1 text-sm font-medium text-slate-900">{customer.phone_number || "—"}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Calendar className="h-3.5 w-3.5" /> Joined
          </div>
          <p className="mt-1 text-sm font-medium text-slate-900">
            {new Date(customer.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-xs text-slate-500">Lifetime Value</p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                GH₵{customer.total_spent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">{customer.order_count} order{customer.order_count !== 1 ? "s" : ""}</p>
            </div>
            <MiniSparkline orders={customer.orders} />
          </div>
        </div>
      </div>

      {/* Order timeline */}
      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-600">
          Order History
        </h2>
        <OrderTimeline orders={customer.orders} />
      </div>
    </section>
  );
}
