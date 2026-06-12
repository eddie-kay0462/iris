"use client";

import {
  Area,
  Brush,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chart, formatDateLabel, formatMetric, formatMetricShort, MetricFormat } from "@/lib/charts/theme";

export interface SeriesPoint {
  date: string;
  value: number;
}

/**
 * Shopify-style time series: solid ink area for the current period with an
 * optional dashed gray overlay for the previous period (index-aligned).
 */
export function ComparisonLineChart({
  series,
  previousSeries,
  height = 280,
  format = "currency",
  showBrush = false,
  color = chart.primary,
}: {
  series: SeriesPoint[];
  previousSeries?: SeriesPoint[];
  height?: number;
  format?: MetricFormat;
  showBrush?: boolean;
  color?: string;
}) {
  const rows = series.map((p, i) => ({
    date: p.date,
    current: p.value,
    previous: previousSeries?.[i]?.value ?? null,
    previousDate: previousSeries?.[i]?.date ?? null,
  }));

  if (rows.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex w-full items-center justify-center rounded-lg bg-slate-50 text-xs text-slate-400"
      >
        No data for this date range
      </div>
    );
  }

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="inkArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chart.areaTop} />
              <stop offset="100%" stopColor={chart.areaBottom} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={chart.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDateLabel}
            tick={{ fontSize: 11, fill: chart.axis }}
            tickLine={false}
            axisLine={{ stroke: chart.grid }}
            minTickGap={32}
          />
          <YAxis
            tickFormatter={(v: number) => formatMetricShort(v, format)}
            tick={{ fontSize: 11, fill: chart.axis }}
            tickLine={false}
            axisLine={false}
            width={56}
          />
          <Tooltip
            cursor={{ stroke: chart.muted, strokeWidth: 1 }}
            contentStyle={{
              borderRadius: 10,
              border: `1px solid ${chart.grid}`,
              boxShadow: "0 4px 12px rgba(15,23,42,0.08)",
              fontSize: 12,
            }}
            labelFormatter={(label) => formatDateLabel(String(label))}
            formatter={((value: unknown, name: unknown, item: any) => {
              const v = formatMetric(Number(value ?? 0), format);
              if (name === "previous") {
                const prevDate = item?.payload?.previousDate;
                return [v, prevDate ? `Previous (${formatDateLabel(prevDate)})` : "Previous period"];
              }
              return [v, "This period"];
            }) as any}
          />
          {previousSeries && previousSeries.length > 0 && (
            <Line
              type="monotone"
              dataKey="previous"
              stroke={chart.comparison}
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              isAnimationActive={false}
            />
          )}
          <Area
            type="monotone"
            dataKey="current"
            stroke={color}
            strokeWidth={2}
            fill="url(#inkArea)"
            dot={false}
            activeDot={{ r: 3, fill: color }}
            isAnimationActive={false}
          />
          {showBrush && (
            <Brush
              dataKey="date"
              height={24}
              stroke={chart.muted}
              fill="#f8fafc"
              tickFormatter={formatDateLabel}
              travellerWidth={8}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Two solid series on one chart (e.g. online vs pop-up). Monochrome:
 * first series ink, second mid-gray.
 */
export function DualLineChart({
  rows,
  keys,
  height = 280,
  format = "currency",
}: {
  rows: Array<Record<string, string | number | null>>;
  keys: { key: string; label: string }[];
  height?: number;
  format?: MetricFormat;
}) {
  const palette = [chart.primary, chart.secondary, chart.tertiary];
  if (rows.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex w-full items-center justify-center rounded-lg bg-slate-50 text-xs text-slate-400"
      >
        No data for this date range
      </div>
    );
  }
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={chart.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDateLabel}
            tick={{ fontSize: 11, fill: chart.axis }}
            tickLine={false}
            axisLine={{ stroke: chart.grid }}
            minTickGap={32}
          />
          <YAxis
            tickFormatter={(v: number) => formatMetricShort(v, format)}
            tick={{ fontSize: 11, fill: chart.axis }}
            tickLine={false}
            axisLine={false}
            width={56}
          />
          <Tooltip
            cursor={{ stroke: chart.muted, strokeWidth: 1 }}
            contentStyle={{
              borderRadius: 10,
              border: `1px solid ${chart.grid}`,
              boxShadow: "0 4px 12px rgba(15,23,42,0.08)",
              fontSize: 12,
            }}
            labelFormatter={(label) => formatDateLabel(String(label))}
            formatter={((value: unknown, name: unknown) => [
              formatMetric(Number(value ?? 0), format),
              keys.find((k) => k.key === name)?.label ?? String(name),
            ]) as any}
          />
          {keys.map((k, i) => (
            <Line
              key={k.key}
              type="monotone"
              dataKey={k.key}
              stroke={palette[i % palette.length]}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
