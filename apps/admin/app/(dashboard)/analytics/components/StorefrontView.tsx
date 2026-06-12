"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useAnalytics } from "@/lib/api/orders";
import {
  useDateRange,
  useReport,
  useReturningCustomerRate,
  useSalesBreakdown,
  useSessionsAnalytics,
  useAbandonedCheckouts,
} from "@/lib/api/analytics";
import { StatusBadge } from "../../../components/StatusBadge";
import { OrderFunnel } from "./OrderFunnel";
import { ChartCard } from "@/app/components/charts/ChartCard";
import { Sparkline } from "@/app/components/charts/Sparkline";
import { ComparisonLineChart } from "@/app/components/charts/ComparisonLineChart";
import { HBarChart } from "@/app/components/charts/HBarChart";
import { DeltaBadge } from "@/app/components/DeltaBadge";
import { formatGHS, formatMetric } from "@/lib/charts/theme";

function DateRangeSelector({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-sm text-slate-500">{label}</span>}
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
    </div>
  );
}

function Kpi({
  label,
  value,
  delta,
  sub,
  spark,
}: {
  label: string;
  value: string;
  delta?: React.ReactNode;
  sub?: string;
  spark?: Record<string, number>;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div>
        <p className="text-xl font-bold leading-none tabular-nums text-slate-900">{value}</p>
        {(delta || sub) && (
          <div className="mt-1 flex items-center gap-2">
            {delta}
            {sub && <span className="text-[11px] text-slate-400">{sub}</span>}
          </div>
        )}
      </div>
      {spark && <Sparkline data={spark} height={24} />}
    </div>
  );
}

/** Two-period side-by-side comparison (kept from the original view). */
function StorefrontMetricsColumn({ days, label }: { days: string; label: string }) {
  const range = useDateRange(parseInt(days));
  const { data: breakdown } = useSalesBreakdown(range);

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <Kpi label="Net Sales" value={breakdown ? formatGHS(breakdown.netSales) : "—"} />
      <Kpi label="Orders" value={breakdown ? String(breakdown.orders) : "—"} />
      <Kpi
        label="Avg. Order Value"
        value={
          breakdown && breakdown.orders > 0 ? formatGHS(breakdown.netSales / breakdown.orders) : "—"
        }
      />
    </div>
  );
}

export function StorefrontView() {
  const [days, setDays] = useState("30");
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [daysB, setDaysB] = useState("90");

  const range = useDateRange(parseInt(days));

  const fromDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - parseInt(days));
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  }, [days]);

  const { data, isLoading, error } = useAnalytics({ from_date: fromDate });
  const { data: breakdown } = useSalesBreakdown(range);
  const { data: sessions } = useSessionsAnalytics(range);
  const { data: returningRate } = useReturningCustomerRate(range);
  const { data: salesReport } = useReport("total-sales-over-time", range);
  const { data: aovReport } = useReport("aov-over-time", range);
  const { data: sellThrough } = useReport("sell-through-rate", range);
  const { data: abandoned } = useAbandonedCheckouts({ page: 1 });

  const salesSeries = useMemo(
    () =>
      (salesReport?.series ?? []).map((r) => ({
        date: String(r.date),
        value: Number(r.totalSales ?? 0),
      })),
    [salesReport],
  );
  const salesPrevSeries = useMemo(
    () =>
      (salesReport?.previousSeries ?? []).map((r) => ({
        date: String(r.date),
        value: Number(r.totalSales ?? 0),
      })),
    [salesReport],
  );
  const aovSeries = useMemo(
    () =>
      (aovReport?.series ?? []).map((r) => ({ date: String(r.date), value: Number(r.aov ?? 0) })),
    [aovReport],
  );
  const aovPrevSeries = useMemo(
    () =>
      (aovReport?.previousSeries ?? []).map((r) => ({
        date: String(r.date),
        value: Number(r.aov ?? 0),
      })),
    [aovReport],
  );

  const conversionSpark = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [day, v] of Object.entries(sessions?.conversionByDay ?? {})) {
      out[day] = v.sessions > 0 ? (v.purchased / v.sessions) * 100 : 0;
    }
    return out;
  }, [sessions]);

  const trackingNote = sessions?.trackingSince
    ? `Tracking since ${new Date(sessions.trackingSince).toLocaleDateString()}`
    : "Storefront tracking starts with the first visitor session.";

  const funnelStages = [
    { label: "Sessions", value: sessions?.funnel.sessions ?? 0 },
    { label: "Added to cart", value: sessions?.funnel.addedToCart ?? 0 },
    { label: "Reached checkout", value: sessions?.funnel.reachedCheckout ?? 0 },
    { label: "Completed checkout", value: sessions?.funnel.purchased ?? 0 },
  ];

  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-6">
        <p className="text-sm font-medium text-rose-900">Failed to load analytics data.</p>
        <p className="mt-1 text-xs text-rose-700">{(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <DateRangeSelector value={days} onChange={setDays} />
        <button
          onClick={() => setCompareEnabled((v) => !v)}
          className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            compareEnabled
              ? "border-slate-800 bg-slate-900 text-white"
              : "border-slate-200 text-slate-600 hover:border-slate-300"
          }`}
        >
          Compare periods
        </button>
        {compareEnabled && <DateRangeSelector value={daysB} onChange={setDaysB} label="vs" />}
      </div>

      {compareEnabled ? (
        <div className="grid gap-6 sm:grid-cols-2">
          <StorefrontMetricsColumn days={days} label="Period A" />
          <StorefrontMetricsColumn days={daysB} label="Period B" />
        </div>
      ) : isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : (
        <>
          {/* ── KPI strip ──────────────────────────────────────────────── */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <Kpi
              label="Net Sales"
              value={breakdown ? formatGHS(breakdown.netSales) : "—"}
              delta={
                breakdown ? (
                  <DeltaBadge current={breakdown.netSales} previous={breakdown.previous.netSales} />
                ) : undefined
              }
              spark={data?.revenueByDay}
            />
            <Kpi
              label="Orders"
              value={breakdown ? String(breakdown.orders) : "—"}
              delta={
                breakdown ? (
                  <DeltaBadge current={breakdown.orders} previous={breakdown.previous.orders} />
                ) : undefined
              }
              spark={data?.ordersByDay}
            />
            <Kpi
              label="Avg. Order Value"
              value={
                breakdown && breakdown.orders > 0
                  ? formatGHS(breakdown.netSales / breakdown.orders)
                  : "—"
              }
            />
            <Kpi
              label="Sessions"
              value={sessions ? String(sessions.funnel.sessions) : "—"}
              delta={
                sessions ? (
                  <DeltaBadge
                    current={sessions.funnel.sessions}
                    previous={sessions.previous.funnel.sessions}
                  />
                ) : undefined
              }
              spark={sessions?.sessionsByDay}
            />
            <Kpi
              label="Conversion Rate"
              value={sessions ? formatMetric(sessions.conversionRate, "percent") : "—"}
              delta={
                sessions ? (
                  <DeltaBadge
                    current={sessions.conversionRate}
                    previous={sessions.previous.conversionRate}
                  />
                ) : undefined
              }
              spark={conversionSpark}
            />
            <Kpi
              label="Returning Rate"
              value={returningRate ? formatMetric(returningRate.rate, "percent") : "—"}
              delta={
                returningRate ? (
                  <DeltaBadge current={returningRate.rate} previous={returningRate.previousRate} />
                ) : undefined
              }
              sub={returningRate ? `${returningRate.returning} returning` : undefined}
            />
          </div>

          {/* ── Sales over time ────────────────────────────────────────── */}
          <ChartCard
            title="Total sales over time"
            value={salesReport ? formatGHS(salesReport.table.totals.totalSales ?? 0) : undefined}
            delta={
              salesReport?.table.previousTotals ? (
                <DeltaBadge
                  current={salesReport.table.totals.totalSales ?? 0}
                  previous={salesReport.table.previousTotals.totalSales ?? 0}
                />
              ) : undefined
            }
            action={
              <Link
                href="/analytics/reports/total-sales-over-time"
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900"
              >
                View report <ArrowRight className="h-3 w-3" />
              </Link>
            }
          >
            <ComparisonLineChart series={salesSeries} previousSeries={salesPrevSeries} height={300} />
          </ChartCard>

          {/* ── Breakdown + AOV ────────────────────────────────────────── */}
          <div className="grid gap-5 lg:grid-cols-2">
            <ChartCard title="Total sales breakdown">
              <div className="divide-y divide-slate-100">
                {(
                  [
                    { key: "grossSales", label: "Gross sales" },
                    { key: "discounts", label: "Discounts", invert: true },
                    { key: "returns", label: "Returns", invert: true },
                    { key: "netSales", label: "Net sales", strong: true },
                    { key: "shipping", label: "Shipping charges" },
                    { key: "tax", label: "Taxes" },
                    { key: "totalSales", label: "Total sales", strong: true },
                  ] as const
                ).map((line) => {
                  const value = breakdown ? (breakdown[line.key] as number) : null;
                  const prev = breakdown ? (breakdown.previous as any)[line.key] as number : null;
                  return (
                    <div key={line.key} className="flex items-center justify-between py-2.5">
                      <span
                        className={`text-sm ${
                          "strong" in line && line.strong
                            ? "font-semibold text-slate-900"
                            : "text-slate-600"
                        }`}
                      >
                        {line.label}
                      </span>
                      <span className="flex items-center gap-3">
                        {value != null && prev != null && (
                          <DeltaBadge
                            current={value}
                            previous={prev}
                            invert={"invert" in line && line.invert}
                          />
                        )}
                        <span
                          className={`tabular-nums text-sm ${
                            "strong" in line && line.strong
                              ? "font-semibold text-slate-900"
                              : "text-slate-700"
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

            <ChartCard
              title="Average order value over time"
              value={aovReport ? formatGHS(aovReport.table.totals.aov ?? 0) : undefined}
              delta={
                aovReport?.table.previousTotals ? (
                  <DeltaBadge
                    current={aovReport.table.totals.aov ?? 0}
                    previous={aovReport.table.previousTotals.aov ?? 0}
                  />
                ) : undefined
              }
            >
              <ComparisonLineChart series={aovSeries} previousSeries={aovPrevSeries} height={240} />
            </ChartCard>
          </div>

          {/* ── Funnels ────────────────────────────────────────────────── */}
          <div className="grid gap-5 lg:grid-cols-2">
            <ChartCard title="Conversion funnel" note={trackingNote}>
              <div className="space-y-3">
                {funnelStages.map((stage, i) => {
                  const first = funnelStages[0].value;
                  const prevStage = i > 0 ? funnelStages[i - 1].value : null;
                  const pct = first > 0 ? (stage.value / first) * 100 : 0;
                  const dropOff =
                    prevStage && prevStage > 0
                      ? ((prevStage - stage.value) / prevStage) * 100
                      : null;
                  return (
                    <div key={stage.label}>
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="text-slate-600">{stage.label}</span>
                        <span className="flex items-baseline gap-2">
                          {dropOff != null && dropOff > 0 && (
                            <span className="text-[11px] text-slate-400">
                              −{dropOff.toFixed(0)}%
                            </span>
                          )}
                          <span className="font-semibold tabular-nums text-slate-900">
                            {stage.value}
                          </span>
                          <span className="w-12 text-right text-xs tabular-nums text-slate-400">
                            {first > 0 ? `${pct.toFixed(1)}%` : "—"}
                          </span>
                        </span>
                      </div>
                      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-slate-800 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </ChartCard>

            <ChartCard title="Fulfillment funnel" note="Paid orders progressing to delivery.">
              {data?.funnelCounts && Object.keys(data.funnelCounts).length > 0 ? (
                <OrderFunnel funnelCounts={data.funnelCounts} />
              ) : (
                <p className="py-8 text-center text-xs text-slate-400">No orders in this period</p>
              )}
            </ChartCard>
          </div>

          {/* ── Abandoned checkouts callout ────────────────────────────── */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {abandoned ? abandoned.total : "—"} abandoned checkout
                {abandoned?.total === 1 ? "" : "s"}
              </p>
              <p className="text-xs text-slate-500">
                Carts where customers reached checkout but didn’t complete payment.
              </p>
            </div>
            <Link
              href="/orders/abandoned"
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
            >
              View abandoned checkouts <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* ── Products ───────────────────────────────────────────────── */}
          <div className="grid gap-5 lg:grid-cols-2">
            <ChartCard title="Sales by product">
              <HBarChart
                format="currency"
                maxRows={8}
                rows={(data?.topProducts ?? []).map((p) => ({
                  label: p.name,
                  value: p.revenue,
                  sub: `${p.unitsSold} units`,
                  leading: p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imageUrl} alt="" className="h-9 w-9 rounded-md object-cover" />
                  ) : (
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-xs text-slate-400">
                      —
                    </span>
                  ),
                }))}
              />
            </ChartCard>

            <ChartCard
              title="Products by sell-through rate"
              note="Units sold ÷ (units sold + units in stock) for the selected period."
              action={
                <Link
                  href="/analytics/reports/sell-through-rate"
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900"
                >
                  View report <ArrowRight className="h-3 w-3" />
                </Link>
              }
            >
              <HBarChart
                format="percent"
                maxRows={8}
                rows={(sellThrough?.table.rows ?? []).map((r) => ({
                  label: String(r.product ?? ""),
                  value: Number(r.sellThroughRate ?? 0),
                  sub: `${r.unitsSold} sold · ${r.inventory} in stock`,
                }))}
              />
            </ChartCard>
          </div>

          {/* ── Sessions splits ────────────────────────────────────────── */}
          <div className="grid gap-5 lg:grid-cols-3">
            <ChartCard title="Sessions by device type">
              <HBarChart
                format="number"
                rows={Object.entries(sessions?.byDevice ?? {})
                  .sort(([, a], [, b]) => b - a)
                  .map(([label, value]) => ({
                    label: label.charAt(0).toUpperCase() + label.slice(1),
                    value,
                  }))}
                emptyLabel="No sessions tracked yet"
              />
            </ChartCard>
            <ChartCard title="Sessions by referrer">
              <HBarChart
                format="number"
                rows={Object.entries(sessions?.byReferrer ?? {})
                  .sort(([, a], [, b]) => b - a)
                  .map(([label, value]) => ({ label, value }))}
                emptyLabel="No sessions tracked yet"
              />
            </ChartCard>
            <ChartCard title="Sessions by landing page">
              <HBarChart
                format="number"
                rows={Object.entries(sessions?.byLandingPage ?? {})
                  .sort(([, a], [, b]) => b - a)
                  .map(([label, value]) => ({ label, value }))}
                emptyLabel="No sessions tracked yet"
              />
            </ChartCard>
          </div>

          {/* ── Status breakdown (kept) ────────────────────────────────── */}
          {data && Object.keys(data.statusBreakdown).length > 0 && (
            <ChartCard title="Status breakdown">
              <div className="flex flex-wrap gap-3">
                {Object.entries(data.statusBreakdown).map(([status, count]) => (
                  <div
                    key={status}
                    className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2"
                  >
                    <StatusBadge status={status} />
                    <span className="text-sm font-semibold text-slate-900">{count}</span>
                  </div>
                ))}
              </div>
            </ChartCard>
          )}
        </>
      )}
    </div>
  );
}
