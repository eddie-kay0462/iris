"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useDateRange, useReport } from "@/lib/api/analytics";
import type { ReportPayload, ReportSummaryMetric } from "@/lib/api/analytics";
import { ChartCard } from "@/app/components/charts/ChartCard";
import { Sparkline } from "@/app/components/charts/Sparkline";
import { ComparisonLineChart } from "@/app/components/charts/ComparisonLineChart";
import { HBarChart } from "@/app/components/charts/HBarChart";
import { DonutChart } from "@/app/components/charts/DonutChart";
import { DeltaBadge } from "@/app/components/DeltaBadge";
import { formatGHS, formatGHSShort, formatMetric } from "@/lib/charts/theme";

/** Pull one summary metric out of a report payload by key. */
function metricOf(report: ReportPayload | undefined, key: string): ReportSummaryMetric | undefined {
  return report?.summary.find((m) => m.key === key);
}

function Kpi({
  label,
  metric,
  spark,
}: {
  label: string;
  metric: ReportSummaryMetric | undefined;
  spark?: Record<string, number>;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div>
        <p className="text-xl font-bold leading-none tabular-nums text-slate-900">
          {metric ? formatMetric(metric.value, metric.format) : "—"}
        </p>
        {metric && metric.previousValue !== null && (
          <div className="mt-1 flex items-center gap-2">
            <DeltaBadge current={metric.value} previous={metric.previousValue} />
            <span className="text-[11px] text-slate-400">vs previous period</span>
          </div>
        )}
      </div>
      {spark && <Sparkline data={spark} height={24} />}
    </div>
  );
}

export function WalkinsView() {
  const [days, setDays] = useState("30");
  const range = useDateRange(parseInt(days));

  const { data: sales, isLoading, error } = useReport("walkin-sales-over-time", range);
  const { data: payments } = useReport("walkin-payment-methods", range);
  const { data: hours } = useReport("walkin-sales-by-hour", range);
  const { data: staff } = useReport("walkin-staff-performance", range);
  const { data: basket } = useReport("walkin-basket", range);

  const netSalesSeries = useMemo(
    () =>
      (sales?.series ?? []).map((r) => ({ date: String(r.date), value: Number(r.netSales ?? 0) })),
    [sales],
  );
  const netSalesPrevSeries = useMemo(
    () =>
      (sales?.previousSeries ?? []).map((r) => ({
        date: String(r.date),
        value: Number(r.netSales ?? 0),
      })),
    [sales],
  );
  /** Sparkline wants a plain date → value map. */
  const sparkOf = (key: string): Record<string, number> =>
    Object.fromEntries((sales?.series ?? []).map((r) => [String(r.date), Number(r[key] ?? 0)]));

  const paymentRows = useMemo(
    () =>
      (payments?.table.rows ?? []).map((r) => ({
        name: String(r.method),
        value: Number(r.revenue ?? 0),
        orders: Number(r.orders ?? 0),
      })),
    [payments],
  );
  const paymentTotal = paymentRows.reduce((s, r) => s + r.value, 0);

  const hourRows = useMemo(
    () =>
      (hours?.table.rows ?? []).map((r) => ({
        label: String(r.hour),
        value: Number(r.revenue ?? 0),
        sub: `${Number(r.orders ?? 0)} orders`,
      })),
    [hours],
  );
  /** Busiest hours first — the flat 24-row table is for the report page. */
  const busiestHours = useMemo(
    () => [...hourRows].sort((a, b) => b.value - a.value),
    [hourRows],
  );

  const staffRows = useMemo(
    () =>
      (staff?.table.rows ?? []).map((r) => ({
        label: String(r.staff),
        value: Number(r.revenue ?? 0),
        sub: `${Number(r.orders ?? 0)} orders · ${formatGHS(Number(r.aov ?? 0))} avg`,
      })),
    [staff],
  );

  const productRows = useMemo(
    () =>
      (basket?.table.rows ?? []).map((r) => ({
        label: String(r.product),
        value: Number(r.revenue ?? 0),
        sub: `${Number(r.units ?? 0)} units`,
      })),
    [basket],
  );

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        Failed to load walk-in analytics.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-500">Period</span>
        <select
          value={days}
          onChange={(e) => setDays(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="365">Last year</option>
        </select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Net Sales" metric={metricOf(sales, "netSales")} spark={sparkOf("netSales")} />
          <Kpi label="Orders" metric={metricOf(sales, "orders")} spark={sparkOf("orders")} />
          <Kpi label="Avg. Order Value" metric={metricOf(sales, "aov")} spark={sparkOf("aov")} />
          <Kpi label="Units per Order" metric={metricOf(basket, "unitsPerOrder")} />
        </div>
      )}

      <ChartCard
        title="Walk-in sales over time"
        value={sales ? formatGHS(sales.table.totals.netSales ?? 0) : "—"}
        delta={
          sales?.table.previousTotals && (
            <DeltaBadge
              current={sales.table.totals.netSales ?? 0}
              previous={sales.table.previousTotals.netSales ?? 0}
            />
          )
        }
        action={
          <Link
            href="/analytics/reports/walkin-sales-over-time"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900"
          >
            View report <ArrowRight className="h-3 w-3" />
          </Link>
        }
      >
        <ComparisonLineChart
          series={netSalesSeries}
          previousSeries={netSalesPrevSeries}
          height={280}
        />
      </ChartCard>

      <div className="grid gap-5 lg:grid-cols-5">
        <ChartCard title="Payment methods" className="lg:col-span-2">
          <DonutChart
            data={paymentRows}
            centerValue={formatGHSShort(paymentTotal)}
            centerLabel="Total"
            height={180}
          />
          {paymentRows.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
              {paymentRows.map((r) => (
                <span key={r.name}>
                  {r.name} · {r.orders} orders
                </span>
              ))}
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="Busiest hours"
          className="lg:col-span-3"
          note="Revenue by hour of day, across the whole period."
        >
          <HBarChart rows={busiestHours} maxRows={8} emptyLabel="No walk-in sales in this range" />
        </ChartCard>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard title="Sales by staff">
          <HBarChart rows={staffRows} maxRows={8} emptyLabel="No walk-in sales in this range" />
        </ChartCard>
        <ChartCard title="Top products at the counter">
          <HBarChart rows={productRows} maxRows={8} emptyLabel="No walk-in sales in this range" />
        </ChartCard>
      </div>
    </div>
  );
}
