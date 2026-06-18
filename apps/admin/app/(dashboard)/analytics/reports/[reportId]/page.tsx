"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { useDateRange, useReport } from "@/lib/api/analytics";
import { ComparisonLineChart } from "@/app/components/charts/ComparisonLineChart";
import { HBarChart } from "@/app/components/charts/HBarChart";
import { MetricDataTable } from "@/app/components/charts/MetricDataTable";
import { DeltaBadge } from "@/app/components/DeltaBadge";
import { formatMetric } from "@/lib/charts/theme";

const RANGES = [
  { value: 7, label: "7D" },
  { value: 30, label: "30D" },
  { value: 90, label: "90D" },
  { value: 365, label: "1Y" },
];

const GRANULARITIES = [
  { value: "day", label: "Daily" },
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
] as const;

export default function SingleReportPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = use(params);
  const [days, setDays] = useState(30);
  const [granularity, setGranularity] = useState<"day" | "week" | "month">("day");
  const range = useDateRange(days);

  const { data: report, isLoading, error } = useReport(reportId, range, granularity);

  // Numeric columns drive the chart metric selector
  const metricColumns = useMemo(
    () => (report?.table.columns ?? []).filter((c) => c.format !== "text"),
    [report],
  );
  const [metricKey, setMetricKey] = useState<string | null>(null);
  const activeMetric =
    metricColumns.find((c) => c.key === metricKey) ??
    metricColumns.find((c) => c.key === report?.summary[0]?.key) ??
    metricColumns[0];

  const hasSeries = !!report?.series && report.series.length > 0;

  const chartSeries = useMemo(() => {
    if (!report?.series || !activeMetric) return [];
    return report.series.map((r) => ({
      date: String(r.date),
      value: Number(r[activeMetric.key] ?? 0),
    }));
  }, [report, activeMetric]);

  const chartPrevSeries = useMemo(() => {
    if (!report?.previousSeries || !activeMetric) return [];
    return report.previousSeries.map((r) => ({
      date: String(r.date),
      value: Number(r[activeMetric.key] ?? 0),
    }));
  }, [report, activeMetric]);

  // Dimension reports: first text column is the label
  const dimensionRows = useMemo(() => {
    if (!report || hasSeries || !activeMetric) return [];
    const labelCol = report.table.columns.find((c) => c.format === "text");
    if (!labelCol) return [];
    return report.table.rows.map((r) => ({
      label: String(r[labelCol.key] ?? ""),
      value: Number(r[activeMetric.key] ?? 0),
    }));
  }, [report, hasSeries, activeMetric]);

  function exportCsv() {
    if (!report) return;
    const cols = report.table.columns;
    const lines = [
      cols.map((c) => `"${c.label}"`).join(","),
      ...report.table.rows.map((r) =>
        cols.map((c) => JSON.stringify(r[c.key] ?? "")).join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="space-y-6">
      <Link
        href="/analytics/reports"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" /> Reports
      </Link>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6">
          <p className="text-sm text-rose-800">Could not load this report.</p>
        </div>
      ) : (
        <>
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">{report?.name ?? "…"}</h1>
                {report && (
                  <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                    {report.category}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-400">{report?.description}</p>
              {report?.note && <p className="text-xs text-slate-400">ⓘ {report.note}</p>}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
                {RANGES.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setDays(r.value)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${
                      days === r.value
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
                {GRANULARITIES.map((g) => (
                  <button
                    key={g.value}
                    onClick={() => setGranularity(g.value)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${
                      granularity === g.value
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
              <button
                onClick={exportCsv}
                disabled={!report}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 disabled:opacity-40"
              >
                <Download className="h-4 w-4" /> CSV
              </button>
            </div>
          </header>

          {isLoading || !report ? (
            <div className="space-y-4">
              <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-72 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
            </div>
          ) : (
            <>
              {/* Summary metrics */}
              <div className="flex flex-wrap gap-6 rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
                {report.summary.map((m) => (
                  <div key={m.key}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {m.label}
                    </p>
                    <div className="mt-1 flex items-baseline gap-2">
                      <p className="text-2xl font-bold tabular-nums text-slate-900">
                        {formatMetric(m.value, m.format)}
                      </p>
                      <DeltaBadge current={m.value} previous={m.previousValue} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Chart */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                {metricColumns.length > 1 && (
                  <div className="mb-4 flex flex-wrap items-center gap-1.5">
                    {metricColumns.map((c) => (
                      <button
                        key={c.key}
                        onClick={() => setMetricKey(c.key)}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                          activeMetric?.key === c.key
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                )}
                {hasSeries ? (
                  <ComparisonLineChart
                    series={chartSeries}
                    previousSeries={chartPrevSeries}
                    height={320}
                    format={activeMetric?.format ?? "number"}
                  />
                ) : (
                  <HBarChart
                    rows={dimensionRows}
                    format={activeMetric?.format ?? "number"}
                    maxRows={12}
                  />
                )}
              </div>

              {/* Data table */}
              <MetricDataTable
                columns={report.table.columns}
                rows={report.table.rows}
                totals={report.table.totals}
                previousTotals={report.table.previousTotals}
              />
            </>
          )}
        </>
      )}
    </section>
  );
}
