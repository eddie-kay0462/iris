"use client";

import { useState } from "react";
import { useAnalytics } from "@/lib/api/orders";
import { StatusBadge } from "../../components/StatusBadge";

function DateRangeSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
    >
      <option value="7">Last 7 days</option>
      <option value="30">Last 30 days</option>
      <option value="90">Last 90 days</option>
      <option value="365">Last year</option>
    </select>
  );
}

function RevenueChart({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) return <p className="text-sm text-slate-500">No data in this period.</p>;

  const maxVal = Math.max(...entries.map(([, v]) => v), 1);

  return (
    <div className="space-y-1.5">
      {entries.map(([day, amount]) => (
        <div key={day} className="flex items-center gap-3 text-xs">
          <span className="w-20 shrink-0 text-slate-500">{day.slice(5)}</span>
          <div className="flex-1">
            <div
              className="h-5 rounded bg-blue-500 transition-all"
              style={{ width: `${(amount / maxVal) * 100}%`, minWidth: amount > 0 ? "4px" : "0px" }}
            />
          </div>
          <span className="w-24 shrink-0 text-right font-medium text-slate-700">
            GH₵{amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      ))}
    </div>
  );
}

function OrdersChart({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) return <p className="text-sm text-slate-500">No data in this period.</p>;

  const maxVal = Math.max(...entries.map(([, v]) => v), 1);

  return (
    <div className="space-y-1.5">
      {entries.map(([day, count]) => (
        <div key={day} className="flex items-center gap-3 text-xs">
          <span className="w-20 shrink-0 text-slate-500">{day.slice(5)}</span>
          <div className="flex-1">
            <div
              className="h-5 rounded bg-indigo-500 transition-all"
              style={{ width: `${(count / maxVal) * 100}%`, minWidth: count > 0 ? "4px" : "0px" }}
            />
          </div>
          <span className="w-10 shrink-0 text-right font-medium text-slate-700">
            {count}
          </span>
        </div>
      ))}
    </div>
  );
}

function TopProducts({
  products,
}: {
  products: { name: string; revenue: number; unitsSold: number }[];
}) {
  if (products.length === 0) return <p className="text-sm text-slate-500">No product data.</p>;

  const maxRev = Math.max(...products.map((p) => p.revenue), 1);

  return (
    <div className="space-y-3">
      {products.map((p, i) => (
        <div key={p.name} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-900">
              <span className="mr-2 text-slate-400">{i + 1}.</span>
              {p.name}
            </span>
            <span className="text-slate-600">
              GH₵{p.revenue.toLocaleString()} ({p.unitsSold} units)
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-green-500"
              style={{ width: `${(p.revenue / maxRev) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [days, setDays] = useState("30");

  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - parseInt(days));

  const { data, isLoading } = useAnalytics({
    from_date: fromDate.toISOString(),
  });

  return (
    <section className="space-y-6">
      <header className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Analytics</h1>
          <p className="text-sm text-slate-500">
            Performance insights and sales data.
          </p>
        </div>
        <DateRangeSelector value={days} onChange={setDays} />
      </header>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : data ? (
        <>
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Revenue</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                GH₵{data.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Orders</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{data.totalOrders}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Avg. Order Value</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                GH₵{data.totalOrders > 0 ? (data.totalRevenue / data.totalOrders).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
              </p>
            </div>
          </div>

          {/* Status breakdown */}
          {Object.keys(data.statusBreakdown).length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-600">
                Status Breakdown
              </h2>
              <div className="flex flex-wrap gap-3">
                {Object.entries(data.statusBreakdown).map(([status, count]) => (
                  <div key={status} className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2">
                    <StatusBadge status={status} />
                    <span className="text-sm font-semibold text-slate-900">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Revenue by day */}
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-600">
              Revenue by Day
            </h2>
            <RevenueChart data={data.revenueByDay} />
          </div>

          {/* Orders by day */}
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-600">
              Orders by Day
            </h2>
            <OrdersChart data={data.ordersByDay} />
          </div>

          {/* Top products */}
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-600">
              Top Products
            </h2>
            <TopProducts products={data.topProducts} />
          </div>
        </>
      ) : (
        <p className="text-sm text-slate-500">Failed to load analytics data.</p>
      )}
    </section>
  );
}
