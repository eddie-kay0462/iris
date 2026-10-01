"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useDateRange, useReport } from "@/lib/api/analytics";
import type { ReportPayload, ReportSummaryMetric } from "@/lib/api/analytics";
import { B2B_STATUS_LABELS, useB2bSummary } from "@/lib/api/b2b";
import { ChartCard } from "@/app/components/charts/ChartCard";
import { Sparkline } from "@/app/components/charts/Sparkline";
import { ComparisonLineChart } from "@/app/components/charts/ComparisonLineChart";
import { HBarChart } from "@/app/components/charts/HBarChart";
import { DeltaBadge } from "@/app/components/DeltaBadge";
import { formatGHS, formatMetric } from "@/lib/charts/theme";

/** Pull one summary metric out of a report payload by key. */
function metricOf(report: ReportPayload | undefined, key: string): ReportSummaryMetric | undefined {
  return report?.summary.find((m) => m.key === key);
}

function Kpi({
  label,
  metric,
  value,
  sub,
  spark,
}: {
  label: string;
  metric?: ReportSummaryMetric;
  /** Used instead of `metric` for figures that don't come from a report. */
  value?: string;
  sub?: string;
  spark?: Record<string, number>;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div>
        <p className="text-xl font-bold leading-none tabular-nums text-slate-900">
          {value ?? (metric ? formatMetric(metric.value, metric.format) : "—")}
        </p>
        {metric && metric.previousValue !== null ? (
          <div className="mt-1 flex items-center gap-2">
            <DeltaBadge current={metric.value} previous={metric.previousValue} />
            <span className="text-[11px] text-slate-400">vs previous period</span>
          </div>
        ) : sub ? (
          <p className="mt-1 text-[11px] text-slate-400">{sub}</p>
        ) : null}
      </div>
      {spark && <Sparkline data={spark} height={24} />}
    </div>
  );
}

export function B2BView() {
  const [days, setDays] = useState("90");
  const range = useDateRange(parseInt(days));
  // B2B orders are few and lumpy; a daily line over a quarter is mostly zeros.
  const granularity = parseInt(days) >= 90 ? "week" : "day";

  const { data: sales, isLoading, error } = useReport("b2b-sales-over-time", range, granularity);
  const { data: byClient } = useReport("b2b-sales-by-client", range);
  const { data: summary } = useB2bSummary({ from: range.from, to: range.to });

  const seriesOf = (rows: ReportPayload["series"], key: string) =>
    (rows ?? []).map((r) => ({ date: String(r.date), value: Number(r[key] ?? 0) }));
  const revenueSeries = useMemo(() => seriesOf(sales?.series, "revenue"), [sales]);
  const revenuePrevSeries = useMemo(() => seriesOf(sales?.previousSeries, "revenue"), [sales]);
  const sparkOf = (key: string): Record<string, number> =>
    Object.fromEntries((sales?.series ?? []).map((r) => [String(r.date), Number(r[key] ?? 0)]));

  const clientRows = useMemo(
    () =>
      (byClient?.table.rows ?? []).map((r) => ({
        label: String(r.client),
        value: Number(r.revenue ?? 0),
        sub: `${Number(r.orders ?? 0)} orders · ${Number(r.units ?? 0).toLocaleString()} units · ${formatMetric(
          Number(r.margin ?? 0),
          "percent",
        )} margin`,
      })),
    [byClient],
  );

  const pipelineRows = useMemo(
    () =>
      summary
        ? (["draft", "confirmed", "in_production"] as const).map((s) => ({
            label: B2B_STATUS_LABELS[s],
            value: summary.pipeline.byStatus[s] ?? 0,
          }))
        : [],
    [summary],
  );

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        Failed to load B2B analytics.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Period</span>
          <select
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
          >
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
        </div>
        <Link
          href="/b2b"
          className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-900"
        >
          Manage B2B orders <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Revenue" metric={metricOf(sales, "revenue")} spark={sparkOf("revenue")} />
          <Kpi label="Gross profit" metric={metricOf(sales, "grossProfit")} spark={sparkOf("grossProfit")} />
          <Kpi label="Gross margin" metric={metricOf(sales, "margin")} />
          <Kpi label="Units delivered" metric={metricOf(sales, "units")} spark={sparkOf("units")} />
        </div>
      )}

      <ChartCard
        title="B2B revenue over time"
        value={sales ? formatGHS(sales.table.totals.revenue ?? 0) : "—"}
        delta={
          sales?.table.previousTotals && (
            <DeltaBadge
              current={sales.table.totals.revenue ?? 0}
              previous={sales.table.previousTotals.revenue ?? 0}
            />
          )
        }
        note="Orders count on the day they are completed."
        action={
          <Link
            href="/analytics/reports/b2b-sales-over-time"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900"
          >
            View report <ArrowRight className="h-3 w-3" />
          </Link>
        }
      >
        <ComparisonLineChart series={revenueSeries} previousSeries={revenuePrevSeries} height={280} />
      </ChartCard>

      <div className="grid gap-5 lg:grid-cols-5">
        <ChartCard
          title="Top clients"
          className="lg:col-span-3"
          action={
            <Link
              href="/analytics/reports/b2b-sales-by-client"
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900"
            >
              View report <ArrowRight className="h-3 w-3" />
            </Link>
          }
        >
          <HBarChart rows={clientRows} maxRows={8} emptyLabel="No completed B2B orders in this range" />
        </ChartCard>

        <div className="space-y-5 lg:col-span-2">
          <ChartCard
            title="Pipeline"
            value={summary ? formatGHS(summary.pipeline.revenue) : "—"}
            note="Orders not yet completed, as of today."
          >
            <HBarChart rows={pipelineRows} format="number" emptyLabel="No ongoing B2B orders" />
          </ChartCard>
          <div className="grid grid-cols-2 gap-4">
            <Kpi
              label="On-time delivery"
              value={summary?.onTime.rate == null ? "—" : `${summary.onTime.rate}%`}
              sub={
                summary && summary.onTime.measured > 0
                  ? `${summary.onTime.onTime} of ${summary.onTime.measured} orders`
                  : "No due dates to measure"
              }
            />
            <Kpi
              label="Overdue"
              value={summary ? String(summary.overdue) : "—"}
              sub="Ongoing, past due"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
