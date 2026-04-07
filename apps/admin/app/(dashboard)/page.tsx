"use client";

import { useMemo, useState } from "react";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Package,
  Users,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Store,
} from "lucide-react";
import { useAdminStats, useAnalytics } from "@/lib/api/orders";
import { RevenueLineChart } from "./components/RevenueLineChart";
import { RevenueTarget } from "./components/RevenueTarget";

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatGHS(v: number) {
  return `GH₵${v.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatGHSShort(v: number) {
  if (v >= 1_000_000) return `GH₵${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `GH₵${(v / 1_000).toFixed(1)}k`;
  return `GH₵${v.toFixed(0)}`;
}

function DeltaBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return null;
  if (previous === 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-600">
        <ArrowUpRight className="h-3 w-3" />
        New
      </span>
    );
  const pct = ((current - previous) / previous) * 100;
  const up = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${up ? "text-emerald-600" : "text-red-500"}`}>
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  delta,
  accent,
  badge,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  delta?: React.ReactNode;
  accent?: string;
  badge?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
          {badge && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
              {badge}
            </span>
          )}
        </div>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: accent ? `${accent}18` : "#f1f5f9" }}
        >
          <Icon className="h-4 w-4" style={{ color: accent ?? "#64748b" }} />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 tabular-nums leading-none">{value}</p>
        {(sub || delta) && (
          <div className="mt-1.5 flex items-center gap-2">
            {delta}
            {sub && <span className="text-xs text-slate-400">{sub}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Brand Split Card ─────────────────────────────────────────────────────────

function BrandSplit({
  brandRevenue,
  activeBrand,
}: {
  brandRevenue: Record<string, number>;
  activeBrand: BrandFilter;
}) {
  const brands = [
    { name: "1NRI", color: "#3b82f6", bg: "#eff6ff" },
    { name: "Unlikely Alliances", color: "#8b5cf6", bg: "#f5f3ff" },
  ];

  const total = Object.values(brandRevenue).reduce((s, v) => s + v, 0) || 1;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Sales by Brand
      </h2>
      <div className="grid grid-cols-2 gap-4">
        {brands.map((b) => {
          const rev = brandRevenue[b.name] ?? 0;
          const pct = (rev / total) * 100;
          const isActive = activeBrand === "both" || activeBrand === b.name;
          return (
            <div
              key={b.name}
              className={`rounded-lg p-4 flex flex-col gap-2 transition-opacity ${
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
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/60">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: b.color }}
                  />
                </div>
                <p className="text-xs" style={{ color: b.color, opacity: 0.8 }}>
                  {pct.toFixed(1)}% of period revenue
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[10px] text-slate-400">
        * Includes storefront + pop-up revenue, attributed by product <code>vendor</code> field.
      </p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const [range, setRange] = useState<TimeRange>("30");
  const [brandFilter, setBrandFilter] = useState<BrandFilter>("both");

  const { data: adminStats } = useAdminStats();

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

  const allTimeFromDate = "2020-01-01"; // Fetch all history for the scrollable chart

  const { data: analytics, isLoading: analyticsLoading } = useAnalytics({ from_date: fromDate });
  const { data: ytdData } = useAnalytics({ from_date: ytdFromDate });
  const { data: allTimeAnalytics, isLoading: allTimeLoading } = useAnalytics({ from_date: allTimeFromDate });

  // ── Brand-aware display values ──────────────────────────────────────────────
  const displayRevenueByDay = useMemo(() => {
    if (brandFilter === "both") return allTimeAnalytics?.revenueByDay ?? {};
    return allTimeAnalytics?.brandRevenueByDay?.[brandFilter] ?? {};
  }, [allTimeAnalytics, brandFilter]);

  const displayRevenue = useMemo(() => {
    if (brandFilter === "both") return analytics?.totalRevenue ?? 0;
    return analytics?.brandRevenue?.[brandFilter] ?? 0;
  }, [analytics, brandFilter]);

  const displayOrders = useMemo(() => {
    if (brandFilter === "both") return analytics?.totalOrders ?? 0;
    return analytics?.brandOrderCount?.[brandFilter] ?? 0;
  }, [analytics, brandFilter]);

  const aov = displayOrders > 0 ? displayRevenue / displayOrders : 0;
  const prevAov = analytics && analytics.previousPeriodOrders > 0
    ? analytics.previousPeriodRevenue / analytics.previousPeriodOrders
    : 0;

  const bestProduct = useMemo(() => {
    const products = analytics?.topProducts ?? [];
    if (brandFilter === "both") return products[0] ?? null;
    return products.find((p) => p.vendor === brandFilter) ?? null;
  }, [analytics, brandFilter]);
  const currentYear = new Date().getFullYear();

  // popup revenue label for "both" mode
  const popupShare = analytics?.popupRevenue
    ? `incl. GH₵${analytics.popupRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })} pop-up`
    : undefined;

  return (
    <section className="space-y-6">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-400">
            Operations overview — storefront + pop-up combined.
          </p>
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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Revenue"
          value={analyticsLoading ? "—" : formatGHS(displayRevenue)}
          icon={DollarSign}
          accent="#3b82f6"
          badge={brandFilter === "both" ? "All channels" : brandFilter}
          sub={brandFilter === "both" ? popupShare : "storefront + pop-up"}
          delta={
            brandFilter === "both" && analytics ? (
              <DeltaBadge current={analytics.totalRevenue} previous={analytics.previousPeriodRevenue} />
            ) : undefined
          }
        />
        <KpiCard
          label="Orders"
          value={analyticsLoading ? "—" : String(displayOrders)}
          icon={ShoppingCart}
          accent="#6366f1"
          badge={brandFilter === "both" ? "All channels" : brandFilter}
          delta={
            brandFilter === "both" && analytics ? (
              <DeltaBadge current={analytics.totalOrders} previous={analytics.previousPeriodOrders} />
            ) : undefined
          }
          sub={brandFilter === "both" ? "vs prev period" : undefined}
        />
        <KpiCard
          label="Avg. Order Value"
          value={analyticsLoading ? "—" : formatGHS(aov)}
          icon={TrendingUp}
          accent="#f59e0b"
          badge={brandFilter === "both" ? "All channels" : brandFilter}
          delta={brandFilter === "both" && analytics ? <DeltaBadge current={aov} previous={prevAov} /> : undefined}
          sub={brandFilter === "both" ? "vs prev period" : undefined}
        />
        <KpiCard
          label="Best Product"
          value={analyticsLoading ? "—" : bestProduct ? bestProduct.unitsSold + " units" : "—"}
          icon={Package}
          accent="#10b981"
          badge={brandFilter === "both" ? "All channels" : brandFilter}
          sub={bestProduct ? bestProduct.name : "No sales yet"}
        />
      </div>

      {/* ── Revenue Chart ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-700">Revenue over time (All-time)</h2>
            {brandFilter !== "both" && (
              <p className="text-xs text-slate-400 mt-0.5">
                Showing {brandFilter} revenue only (storefront + pop-up)
              </p>
            )}
          </div>
          {allTimeAnalytics && (
            <span className="text-xs text-slate-400">
              {Object.keys(displayRevenueByDay).length} days with data
            </span>
          )}
        </div>

        {allTimeLoading ? (
          <div className="h-64 animate-pulse rounded-lg bg-slate-100" />
        ) : (
          <RevenueLineChart
            data={displayRevenueByDay}
            height={240}
            color={
              brandFilter === "Unlikely Alliances"
                ? "#8b5cf6"
                : "#3b82f6"
            }
            formatValue={(v) =>
              `GH₵${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
            }
          />
        )}
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
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Online Orders by Status
            </h2>
            <div className="flex flex-wrap gap-3">
              {Object.entries(adminStats.ordersByStatus).map(([status, count]) => (
                <div key={status} className="flex flex-col items-center rounded-lg border border-slate-100 px-4 py-3 min-w-[80px]">
                  <p className="text-xl font-bold text-slate-900">{count}</p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-400 text-center capitalize">
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
            icon={Users}
            accent="#8b5cf6"
            sub="All-time unique"
          />
          <KpiCard
            label="Low Stock Items"
            value={`${adminStats?.lowStockCount ?? 0}`}
            icon={AlertTriangle}
            accent="#f43f5e"
            sub="Below 10 units"
          />
        </div>
      </div>
    </section>
  );
}
