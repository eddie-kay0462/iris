"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, Calendar } from "lucide-react";
import { useAdminCustomer } from "@/lib/api/orders";
import { StatusBadge } from "../../../components/StatusBadge";

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
        <Link href="/admin/customers" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Back to Customers
        </Link>
        <p className="text-sm text-red-600">Customer not found.</p>
      </section>
    );
  }

  const name = [customer.first_name, customer.last_name].filter(Boolean).join(" ") || "—";

  return (
    <section className="space-y-6">
      <Link href="/admin/customers" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Back to Customers
      </Link>

      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{name}</h1>
        <p className="text-sm text-slate-500">{customer.email}</p>
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
          <p className="text-xs text-slate-500">Lifetime Value</p>
          <p className="mt-1 text-sm font-medium text-slate-900">
            GH₵{customer.total_spent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">{customer.order_count} order{customer.order_count !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Orders table */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
          Order History
        </h2>
        {customer.orders.length === 0 ? (
          <p className="text-sm text-slate-500">No orders yet.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-slate-100 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Items</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {customer.orders.map((order) => (
                  <tr key={order.id} className="border-t border-slate-200 cursor-pointer hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/orders/${order.id}`} className="font-medium text-blue-600 hover:underline">
                        {order.order_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3">{order.order_items?.length || 0}</td>
                    <td className="px-4 py-3">GH₵{Number(order.total).toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(order.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
