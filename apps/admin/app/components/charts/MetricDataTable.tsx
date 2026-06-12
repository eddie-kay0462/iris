"use client";

import { chart, formatDateLabel, formatMetric, MetricFormat } from "@/lib/charts/theme";

export interface MetricColumn {
  key: string;
  label: string;
  format: MetricFormat;
}

export type MetricRow = Record<string, string | number | null>;

function pctChange(current: number, previous: number): string {
  if (previous === 0) return current === 0 ? "—" : "New";
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

/**
 * Shopify-style report table: one row per period (or dimension), a bold
 * totals row, and a "% change vs previous period" row when comparison data
 * is available.
 */
export function MetricDataTable({
  columns,
  rows,
  totals,
  previousTotals,
  maxHeight = 480,
}: {
  columns: MetricColumn[];
  rows: MetricRow[];
  totals?: Record<string, number>;
  previousTotals?: Record<string, number> | null;
  maxHeight?: number;
}) {
  const firstCol = columns[0];
  const metricCols = columns.slice(1);

  const renderCell = (row: MetricRow, col: MetricColumn) => {
    const v = row[col.key];
    if (col.key === "date" && typeof v === "string") return formatDateLabel(v);
    if (typeof v === "number") return formatMetric(v, col.format);
    return v ?? "—";
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <div className="overflow-auto" style={{ maxHeight }}>
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50">
            <tr>
              {columns.map((c, i) => (
                <th
                  key={c.key}
                  className={`whitespace-nowrap border-b border-slate-200 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500 ${
                    i === 0 ? "text-left" : "text-right"
                  }`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {totals && (
              <tr className="bg-white font-semibold text-slate-900">
                <td className="whitespace-nowrap border-b border-slate-200 px-4 py-2.5">Total</td>
                {metricCols.map((c) => (
                  <td key={c.key} className="whitespace-nowrap border-b border-slate-200 px-4 py-2.5 text-right tabular-nums">
                    {totals[c.key] != null ? formatMetric(totals[c.key], c.format) : "—"}
                  </td>
                ))}
              </tr>
            )}
            {totals && previousTotals && (
              <tr className="bg-white text-xs text-slate-500">
                <td className="whitespace-nowrap border-b border-slate-200 px-4 py-2">vs previous period</td>
                {metricCols.map((c) => {
                  const cur = totals[c.key];
                  const prev = previousTotals[c.key];
                  const change = cur != null && prev != null ? pctChange(cur, prev) : "—";
                  const negative = change.startsWith("-");
                  return (
                    <td
                      key={c.key}
                      className="whitespace-nowrap border-b border-slate-200 px-4 py-2 text-right tabular-nums"
                      style={{ color: change === "—" ? undefined : negative ? chart.negative : "#0f172a" }}
                    >
                      {change}
                    </td>
                  );
                })}
              </tr>
            )}
            {rows.map((row, i) => (
              <tr key={i} className="bg-white hover:bg-slate-50">
                <td className="whitespace-nowrap border-b border-slate-100 px-4 py-2.5 text-slate-700">
                  {renderCell(row, firstCol)}
                </td>
                {metricCols.map((c) => (
                  <td
                    key={c.key}
                    className="whitespace-nowrap border-b border-slate-100 px-4 py-2.5 text-right tabular-nums text-slate-700"
                  >
                    {renderCell(row, c)}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-xs text-slate-400">
                  No data for this date range
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
