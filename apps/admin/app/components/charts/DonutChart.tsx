"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { chart, formatMetric, MetricFormat } from "@/lib/charts/theme";

export interface DonutSlice {
  name: string;
  value: number;
}

/** Monochrome donut with a center label and a side legend. */
export function DonutChart({
  data,
  centerLabel,
  centerValue,
  height = 200,
  format = "currency",
}: {
  data: DonutSlice[];
  centerLabel?: string;
  centerValue?: string;
  height?: number;
  format?: MetricFormat;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const hasData = total > 0;

  return (
    <div className="flex items-center gap-6">
      <div style={{ height, width: height }} className="relative shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={hasData ? data : [{ name: "No data", value: 1 }]}
              dataKey="value"
              nameKey="name"
              innerRadius="68%"
              outerRadius="100%"
              paddingAngle={hasData ? 2 : 0}
              stroke="none"
              isAnimationActive={false}
            >
              {(hasData ? data : [{ name: "No data", value: 1 }]).map((_, i) => (
                <Cell key={i} fill={hasData ? chart.donut[i % chart.donut.length] : "#f1f5f9"} />
              ))}
            </Pie>
            {hasData && (
              <Tooltip
                contentStyle={{
                  borderRadius: 10,
                  border: `1px solid ${chart.grid}`,
                  boxShadow: "0 4px 12px rgba(15,23,42,0.08)",
                  fontSize: 12,
                }}
                formatter={((value: unknown, name: unknown) => [
                  formatMetric(Number(value ?? 0), format),
                  String(name),
                ]) as any}
              />
            )}
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          {centerValue && (
            <span className="text-lg font-bold tabular-nums text-slate-900">{centerValue}</span>
          )}
          {centerLabel && <span className="text-[10px] uppercase tracking-wide text-slate-400">{centerLabel}</span>}
        </div>
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        {data.map((d, i) => {
          const pct = total > 0 ? (d.value / total) * 100 : 0;
          return (
            <div key={d.name} className="flex items-center gap-2 text-sm">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: chart.donut[i % chart.donut.length] }}
              />
              <span className="truncate text-slate-600">{d.name}</span>
              <span className="ml-auto whitespace-nowrap tabular-nums text-slate-900 font-medium">
                {formatMetric(d.value, format)}
              </span>
              <span className="w-12 text-right text-xs tabular-nums text-slate-400">{pct.toFixed(1)}%</span>
            </div>
          );
        })}
        {!hasData && <p className="text-xs text-slate-400">No data for this date range</p>}
      </div>
    </div>
  );
}
