"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Store, ArrowRight } from "lucide-react";
import { useAdminStats, useAnalytics } from "@/lib/api/orders";
import {
  useDateRange,
  useSalesBreakdown,
  useSessionsAnalytics,
  useReturningCustomerRate,
} from "@/lib/api/analytics";
import { RevenueTarget } from "./components/RevenueTarget";
import { ComparisonLineChart } from "@/app/components/charts/ComparisonLineChart";
import { Sparkline } from "@/app/components/charts/Sparkline";
import { DonutChart } from "@/app/components/charts/DonutChart";
import { ChartCard } from "@/app/components/charts/ChartCard";
import { DeltaBadge } from "@/app/components/DeltaBadge";
import { formatGHS, formatGHSShort, formatMetric } from "@/lib/charts/theme";

// ─── Filter Types ──────────────────────────────────────────────────────────────

type TimeRange = "7" | "30" | "90" | "365";
type BrandFilter = "both" | "1NRI" | "Unlikely Alliances";

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: "7", label: "7D" },
  { value: "30", label: "30D" },
  { value: "90", label: "90D" },
  { value: "365", label: "1Y" },
];

const BRAND_FILTERS: { value: BrandFilter; label: string }[] = [
  { value: "both", label: "All Brands" },
  { value: "1NRI", label: "1NRI" },
  { value: "Unlikely Alliances", label: "Unlikely Alliances" },
];

// ─── KPI Card with sparkline ──────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  delta,
  badge,
  spark,
}: {
  label: string;
  value: string;
  sub?: string;
  delta?: React.ReactNode;
  badge?: string;
  spark?: Record<string, number>;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        {badge && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
            {badge}
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold leading-none tabular-nums text-slate-900">{value}</p>
        {(sub || delta) && (
          <div className="mt-1.5 flex items-center gap-2">
            {delta}
            {sub && <span className="text-xs text-slate-400">{sub}</span>}
          </div>
        )}
      </div>
      {spark && <Sparkline data={spark} height={28} />}
    </div>
  );
}

// ─── Sales Breakdown (Shopify-style) ──────────────────────────────────────────

function SalesBreakdownCard({ range }: { range: { from: string; to: string } }) {
  const { data } = useSalesBreakdown(range);
  const lines: { key: keyof NonNullable<typeof data>; label: string; strong?: boolean; invert?: boolean }[] = [
    { key: "grossSales", label: "Gross sales" },
    { key: "discounts", label: "Discounts", invert: true },
    { key: "returns", label: "Returns", invert: true },
    { key: "netSales", label: "Net sales", strong: true },
    { key: "shipping", label: "Shipping charges" },
    { key: "tax", label: "Taxes" },
    { key: "totalSales", label: "Total sales", strong: true },
  ];

  return (
    <ChartCard title="Total sales breakdown">
      <div className="divide-y divide-slate-100">
        {lines.map((line) => {
          const value = data ? (data[line.key] as number) : null;
          const prev = data ? (data.previous as any)[line.key] as number : null;
          return (
            <div key={line.key} className="flex items-center justify-between py-2.5">
              <span className={`text-sm ${line.strong ? "font-semibold text-slate-900" : "text-slate-600"}`}>
                {line.label}
              </span>
              <span className="flex items-center gap-3">
                {value != null && prev != null && (
                  <DeltaBadge current={value} previous={prev} invert={line.invert} />
                )}
                <span
                  className={`tabular-nums text-sm ${
                    line.strong ? "font-semibold text-slate-900" : "text-slate-700"
                  }`}
                >
                  {value == null ? "—" : formatGHS(value)}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
}

// ─── Brand Split (monochrome) ─────────────────────────────────────────────────

function BrandSplit({
  brandRevenue,
  activeBrand,
}: {
  brandRevenue: Record<string, number>;
  activeBrand: BrandFilter;
}) {
  const brands = [
    { name: "1NRI", color: "#0f172a", bg: "#f8fafc" },
    { name: "Unlikely Alliances", color: "#475569", bg: "#f8fafc" },
  ];

  const total = Object.values(brandRevenue).reduce((s, v) => s + v, 0) || 1;

  return (
    <ChartCard title="Sales by Brand" note="Includes storefront + pop-up revenue, attributed by product vendor.">
      <div className="grid grid-cols-2 gap-4">
        {brands.map((b) => {
          const rev = brandRevenue[b.name] ?? 0;
          const pct = (rev / total) * 100;
          const isActive = activeBrand === "both" || activeBrand === b.name;
          return (
            <div
              key={b.name}
              className={`flex flex-col gap-2 rounded-lg border border-slate-100 p-4 transition-opacity ${
                isActive ? "opacity-100" : "opacity-40"
              }`}
              style={{ backgroundColor: b.bg }}
            >
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: b.color }}>
                {b.name}
              </p>
              <p className="text-xl font-bold tabular-nums" style={{ color: b.color }}>
                {formatGHSShort(rev)}
              </p>
              <div className="space-y-1">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/60">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: b.color }}
                  />
                </div>
                <p className="text-xs text-slate-500">{pct.toFixed(1)}% of period revenue</p>
              </div>
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const [range, setRange] = useState<TimeRange>("30");
  const [brandFilter, setBrandFilter] = useState<BrandFilter>("both");

  const { data: adminStats } = useAdminStats();
  const dateRange = useDateRange(parseInt(range));

  const fromDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - parseInt(range));
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  }, [range]);

  const ytdFromDate = useMemo(() => {
    const d = new Date();
    d.setMonth(0, 1);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  }, []);

  const allTimeFromDate = "2020-01-01"; // Fetch all history for the brushable chart

  const { data: analytics, isLoading: analyticsLoading } = useAnalytics({ from_date: fromDate });
  const { data: ytdData } = useAnalytics({ from_date: ytdFromDate });
  const { data: allTimeAnalytics, isLoading: allTimeLoading } = useAnalytics({ from_date: allTimeFromDate });
  const { data: sessions } = useSessionsAnalytics(dateRange);
  const { data: returningRate } = useReturningCustomerRate(dateRange);

  // ── Brand-aware display values ──────────────────────────────────────────────
  const displayRevenueByDay = useMemo(() => {
    if (brandFilter === "both") return allTimeAnalytics?.revenueByDay ?? {};
    return allTimeAnalytics?.brandRevenueByDay?.[brandFilter] ?? {};
  }, [allTimeAnalytics, brandFilter]);

  const allTimeSeries = useMemo(
    () =>
      Object.entries(displayRevenueByDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, value]) => ({ date, value })),
    [displayRevenueByDay],
  );

  const displayRevenue = useMemo(() => {
    if (brandFilter === "both") return analytics?.totalRevenue ?? 0;
    return analytics?.brandRevenue?.[brandFilter] ?? 0;
  }, [analytics, brandFilter]);

  const displayOrders = useMemo(() => {
    if (brandFilter === "both") return analytics?.totalOrders ?? 0;
    return analytics?.brandOrderCount?.[brandFilter] ?? 0;
  }, [analytics, brandFilter]);

  const aov = displayOrders > 0 ? displayRevenue / displayOrders : 0;
  const prevAov =
    analytics && analytics.previousPeriodOrders > 0
      ? analytics.previousPeriodRevenue / analytics.previousPeriodOrders
      : 0;

  // Daily AOV sparkline (revenue ÷ orders per day)
  const aovByDay = useMemo(() => {
    const out: Record<string, number> = {};
    const revenue = analytics?.revenueByDay ?? {};
    const orders = analytics?.ordersByDay ?? {};
    for (const [day, rev] of Object.entries(revenue)) {
      const o = orders[day] ?? 0;
      out[day] = o > 0 ? rev / o : 0;
    }
    return out;
  }, [analytics]);

  // Daily conversion-rate sparkline
  const conversionByDay = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [day, v] of Object.entries(sessions?.conversionByDay ?? {})) {
      out[day] = v.sessions > 0 ? (v.purchased / v.sessions) * 100 : 0;
    }
    return out;
  }, [sessions]);

  const currentYear = new Date().getFullYear();

  // Channel split for the donut
  const popupRevenue = analytics?.popupRevenue ?? 0;
  const onlineRevenue = Math.max((analytics?.totalRevenue ?? 0) - popupRevenue, 0);

  const popupShare = analytics?.popupRevenue
    ? `incl. ${formatGHSShort(analytics.popupRevenue)} pop-up`
    : undefined;

  return (
    <section className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-400">Operations overview — storefront + pop-up combined.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Brand filter */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
            {BRAND_FILTERS.map((b) => (
              <button
                key={b.value}
                onClick={() => setBrandFilter(b.value)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${
                  brandFilter === b.value
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {b.value !== "both" && <Store className="h-3 w-3" />}
                {b.label}
              </button>
            ))}
          </div>

          {/* Timeframe */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
            {TIME_RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-all ${
                  range === r.value
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── KPI Strip ─────────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Total Sales"
          value={analyticsLoading ? "—" : formatGHS(displayRevenue)}
          badge={brandFilter === "both" ? "All channels" : brandFilter}
          sub={brandFilter === "both" ? popupShare : "storefront + pop-up"}
          delta={
            brandFilter === "both" && analytics ? (
              <DeltaBadge current={analytics.totalRevenue} previous={analytics.previousPeriodRevenue} />
            ) : undefined
          }
          spark={analytics?.revenueByDay}
        />
        <KpiCard
          label="Orders"
          value={analyticsLoading ? "—" : String(displayOrders)}
          badge={brandFilter === "both" ? "All channels" : brandFilter}
          delta={
            brandFilter === "both" && analytics ? (
              <DeltaBadge current={analytics.totalOrders} previous={analytics.previousPeriodOrders} />
            ) : undefined
          }
          sub={brandFilter === "both" ? "vs prev period" : undefined}
          spark={analytics?.ordersByDay}
        />
        <KpiCard
          label="Avg. Order Value"
          value={analyticsLoading ? "—" : formatGHS(aov)}
          badge={brandFilter === "both" ? "All channels" : brandFilter}
          delta={brandFilter === "both" && analytics ? <DeltaBadge current={aov} previous={prevAov} /> : undefined}
          sub={brandFilter === "both" ? "vs prev period" : undefined}
          spark={aovByDay}
        />
        <KpiCard
          label="Conversion Rate"
          value={sessions ? formatMetric(sessions.conversionRate, "percent") : "—"}
          badge="Online store"
          delta={
            sessions ? (
              <DeltaBadge current={sessions.conversionRate} previous={sessions.previous.conversionRate} />
            ) : undefined
          }
          sub={
            sessions?.trackingSince
              ? `${sessions.funnel.sessions} sessions`
              : "awaiting first tracked session"
          }
          spark={conversionByDay}
        />
        <KpiCard
          label="Returning Customers"
          value={returningRate ? formatMetric(returningRate.rate, "percent") : "—"}
          badge="All channels"
          delta={
            returningRate ? (
              <DeltaBadge current={returningRate.rate} previous={returningRate.previousRate} />
            ) : undefined
          }
          sub={
            returningRate
              ? `${returningRate.returning} of ${returningRate.totalCustomers} customers`
              : undefined
          }
        />
      </div>

      {/* ── Revenue Chart ─────────────────────────────────────────────────── */}
      <div className="-mx-6 rounded-none border-x-0 border-y border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-700">Revenue over time (All-time)</h2>
            {brandFilter !== "both" && (
              <p className="mt-0.5 text-xs text-slate-400">
                Showing {brandFilter} revenue only (storefront + pop-up)
              </p>
            )}
          </div>
          {allTimeAnalytics && (
            <span className="text-xs text-slate-400">{allTimeSeries.length} days with data</span>
          )}
        </div>

        {allTimeLoading ? (
          <div className="h-96 animate-pulse rounded-lg bg-slate-100" />
        ) : (
          <ComparisonLineChart series={allTimeSeries} height={380} showBrush format="currency" />
        )}
      </div>

      {/* ── Sales breakdown + channel split ───────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-2">
        <SalesBreakdownCard range={dateRange} />
        <div className="space-y-5">
          <ChartCard title="Sales by Channel">
            <DonutChart
              data={[
                { name: "Online store", value: onlineRevenue },
                { name: "Pop-up", value: popupRevenue },
              ]}
              centerValue={formatGHSShort(onlineRevenue + popupRevenue)}
              centerLabel="Total"
              height={170}
            />
          </ChartCard>
          <ChartCard
            title="Conversion Funnel"
            action={
              <Link
                href="/analytics/reports/conversion-over-time"
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900"
              >
                View report <ArrowRight className="h-3 w-3" />
              </Link>
            }
            note={
              sessions?.trackingSince
                ? `Tracking since ${new Date(sessions.trackingSince).toLocaleDateString()}`
                : "Storefront tracking starts with the first visitor session."
            }
          >
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Sessions", value: sessions?.funnel.sessions ?? 0 },
                { label: "Added to cart", value: sessions?.funnel.addedToCart ?? 0 },
                { label: "Reached checkout", value: sessions?.funnel.reachedCheckout ?? 0 },
                { label: "Purchased", value: sessions?.funnel.purchased ?? 0 },
              ].map((stage, i, arr) => {
                const first = arr[0].value;
                const pct = first > 0 ? (stage.value / first) * 100 : 0;
                return (
                  <div key={stage.label} className="rounded-lg border border-slate-100 p-3">
                    <p className="text-lg font-bold tabular-nums text-slate-900">{stage.value}</p>
                    <p className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-400">{stage.label}</p>
                    <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-slate-800"
                        style={{ width: `${i === 0 && first > 0 ? 100 : pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </ChartCard>
        </div>
      </div>

      {/* ── Revenue Target + Brand Split ───────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-2">
        <RevenueTarget ytdRevenue={ytdData?.totalRevenue ?? 0} year={currentYear} />
        <BrandSplit brandRevenue={analytics?.brandRevenue ?? {}} activeBrand={brandFilter} />
      </div>

      {/* ── Secondary metrics ─────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {adminStats?.ordersByStatus && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Online Orders by Status
            </h2>
            <div className="flex flex-wrap gap-3">
              {Object.entries(adminStats.ordersByStatus).map(([status, count]) => (
                <div
                  key={status}
                  className="flex min-w-[80px] flex-col items-center rounded-lg border border-slate-100 px-4 py-3"
                >
                  <p className="text-xl font-bold text-slate-900">{count}</p>
                  <p className="mt-0.5 text-center text-[10px] uppercase tracking-wide text-slate-400">
                    {status.replace(/_/g, " ")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <KpiCard
            label="Customers"
            value={String(adminStats?.customerCount ?? 0)}
            sub="All-time unique"
          />
          <KpiCard
            label="Low Stock Items"
            value={`${adminStats?.lowStockCount ?? 0}`}
            sub="Below 10 units"
          />
        </div>
      </div>
    </section>
  );
}
