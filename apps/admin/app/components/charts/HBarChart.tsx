"use client";

import { ReactNode } from "react";
import { formatMetric, MetricFormat } from "@/lib/charts/theme";

export interface HBarRow {
  label: string;
  value: number;
  /** Optional secondary text under the label (e.g. SKU, variant). */
  sub?: string;
  /** Optional leading element (e.g. product thumbnail). */
  leading?: ReactNode;
  /** Optional trailing delta or extra metric. */
  trailing?: ReactNode;
}

/** Shopify-style horizontal bar list (divs, not SVG — crisper typography). */
export function HBarChart({
  rows,
  format = "currency",
  maxRows = 8,
  emptyLabel = "No data for this date range",
}: {
  rows: HBarRow[];
  format?: MetricFormat;
  maxRows?: number;
  emptyLabel?: string;
}) {
  const visible = rows.slice(0, maxRows);
  const max = Math.max(...visible.map((r) => r.value), 0);

  if (visible.length === 0 || max <= 0) {
    return (
      <div className="flex h-28 items-center justify-center rounded-lg bg-slate-50 text-xs text-slate-400">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {visible.map((r, i) => (
        <div key={`${r.label}-${i}`} className="flex items-center gap-3">
          {r.leading}
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-sm text-slate-700">{r.label}</span>
              <span className="flex items-center gap-2 whitespace-nowrap">
                {r.trailing}
                <span className="text-sm font-medium tabular-nums text-slate-900">
                  {formatMetric(r.value, format)}
                </span>
              </span>
            </div>
            {r.sub && <p className="text-[11px] text-slate-400">{r.sub}</p>}
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-slate-800 transition-all duration-500"
                style={{ width: `${(r.value / max) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
