"use client";

import { useMemo, useState } from "react";
import { useAnalytics } from "@/lib/api/orders";
import { StatsCard } from "../../components/StatsCard";
import { StatusBadge } from "../../components/StatusBadge";
import { BarChart } from "./components/BarChart";
import { OrderFunnel } from "./components/OrderFunnel";
import { DollarSign, ShoppingCart, TrendingUp } from "lucide-react";

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

function PeriodComparison({
  current,
  previous,
}: {
  current: number;
  previous: number;
}) {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) {
    return <span className="text-green-600 font-medium">New</span>;
  }
  const pctChange = ((current - previous) / previous) * 100;
  const isUp = pctChange >= 0;
  return (
    <span className={`font-medium ${isUp ? "text-green-600" : "text-red-500"}`}>
      {isUp ? "↑" : "↓"}
      {Math.abs(pctChange).toFixed(1)}% vs prev period
    </span>
  );
}

function TopProducts({
  products,
}: {
  products: { name: string; revenue: number; unitsSold: number; productId: string | null; imageUrl: string | null }[];
}) {
  if (products.length === 0) return <p className="text-sm text-slate-500">No product data.</p>;

  const maxRev = Math.max(...products.map((p) => p.revenue), 1);

  return (
    <div className="space-y-3">
      {products.map((p, i) => (
        <div key={p.name} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-medium text-slate-900">
              <span className="text-slate-400">{i + 1}.</span>
              {p.imageUrl ? (
                <img
                  src={p.imageUrl}
                  alt=""
                  className="h-8 w-8 rounded object-cover"
                />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded bg-slate-100 text-xs text-slate-400">
                  —
                </span>
              )}
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

  const fromDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - parseInt(days));
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  }, [days]);

  const { data, isLoading, error } = useAnalytics({
    from_date: fromDate,
  });

  const avgOrderValue =
    data && data.totalOrders > 0
      ? data.totalRevenue / data.totalOrders
      : 0;

  const prevAvg =
    data && data.previousPeriodOrders > 0
      ? data.previousPeriodRevenue / data.previousPeriodOrders
      : 0;

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
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <p className="text-sm font-medium text-red-800">Failed to load analytics data.</p>
          <p className="mt-1 text-xs text-red-600">{(error as Error).message}</p>
        </div>
      ) : (
        <>
          {/* Summary cards with period comparison */}
          <div className="grid gap-4 sm:grid-cols-3">
            <StatsCard
              label="Revenue"
              value={`GH₵${(data?.totalRevenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              icon={DollarSign}
              helperText={
                data ? (
                  <PeriodComparison
                    current={data.totalRevenue}
                    previous={data.previousPeriodRevenue}
                  />
                ) : undefined
              }
            />
            <StatsCard
              label="Orders"
              value={String(data?.totalOrders ?? 0)}
              icon={ShoppingCart}
              helperText={
                data ? (
                  <PeriodComparison
                    current={data.totalOrders}
                    previous={data.previousPeriodOrders}
                  />
                ) : undefined
              }
            />
            <StatsCard
              label="Avg. Order Value"
              value={`GH₵${avgOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              icon={TrendingUp}
              helperText={
                data ? (
                  <PeriodComparison current={avgOrderValue} previous={prevAvg} />
                ) : undefined
              }
            />
          </div>

          {data && data.totalOrders === 0 && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
              <p className="text-sm font-medium text-slate-600">No orders in this period</p>
              <p className="mt-1 text-xs text-slate-400">Try selecting a longer date range, or data will appear here once orders come in.</p>
            </div>
          )}

          {/* Revenue + Orders charts side by side */}
          {data && (Object.keys(data.revenueByDay).length > 0 || Object.keys(data.ordersByDay).length > 0) && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-white p-6">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-600">
                  Revenue by Day
                </h2>
                <BarChart
                  data={data.revenueByDay}
                  color="#3b82f6"
                  formatValue={(v) =>
                    `GH₵${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                  }
                />
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-6">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-600">
                  Orders by Day
                </h2>
                <BarChart
                  data={data.ordersByDay}
                  color="#6366f1"
                  formatValue={(v) => String(v)}
                />
              </div>
            </div>
          )}

          {/* Order Funnel */}
          {data && data.funnelCounts && Object.keys(data.funnelCounts).length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-600">
                Order Funnel
              </h2>
              <OrderFunnel funnelCounts={data.funnelCounts} />
            </div>
          )}

          {/* Top products */}
          {data && data.topProducts.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-600">
                Top Products
              </h2>
              <TopProducts products={data.topProducts} />
            </div>
          )}

          {/* Status breakdown */}
          {data && Object.keys(data.statusBreakdown).length > 0 && (
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
        </>
      )}
    </section>
  );
}
