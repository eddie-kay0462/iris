"use client";

import { DollarSign, ShoppingCart, Users, AlertTriangle } from "lucide-react";
import { StatsCard } from "../components/StatsCard";
import { useAdminStats } from "@/lib/api/orders";

export default function AdminDashboardPage() {
  const { data: stats, isLoading } = useAdminStats();

  const cards = [
    {
      label: "Total sales",
      value: isLoading
        ? "..."
        : `GH₵${(stats?.totalRevenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      helperText: isLoading
        ? "Loading..."
        : `GH₵${(stats?.recentRevenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} last 30 days`,
    },
    {
      label: "Orders",
      value: isLoading ? "..." : String(stats?.orderCount ?? 0),
      icon: ShoppingCart,
      helperText: "All-time orders",
    },
    {
      label: "Customers",
      value: isLoading ? "..." : String(stats?.customerCount ?? 0),
      icon: Users,
      helperText: "Unique customers",
    },
    {
      label: "Low stock",
      value: isLoading
        ? "..."
        : `${stats?.lowStockCount ?? 0} item${(stats?.lowStockCount ?? 0) !== 1 ? "s" : ""}`,
      icon: AlertTriangle,
      helperText: "Below 10 units",
    },
  ];

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Admin dashboard</h1>
        <p className="text-sm text-slate-500">
          Overview of store performance and operations.
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((stat) => (
          <StatsCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            helperText={stat.helperText}
          />
        ))}
      </div>

      {stats?.ordersByStatus && (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-600">
            Orders by Status
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {Object.entries(stats.ordersByStatus).map(([status, count]) => (
              <div key={status} className="text-center">
                <p className="text-lg font-semibold text-slate-900">{count}</p>
                <p className="text-xs capitalize text-slate-500">{status}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
