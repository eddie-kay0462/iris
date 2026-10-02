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
import { useId } from "react";
import { useIsNewUi } from "@/lib/ui/UiModeContext";
import { useChartTheme, formatDateLabel, formatMetric, formatMetricShort, MetricFormat } from "@/lib/charts/theme";

/**
 * Y-axis width from its widest tick label ("GH₵125.0k" needs more room than
 * "12"), so labels never clip and small numbers don't waste plot width.
 */
function yAxisWidth(values: number[], format: MetricFormat): number {
  const max = Math.max(0, ...values.filter((v) => Number.isFinite(v)));
  const label = formatMetricShort(max, format);
  return Math.max(36, Math.ceil(label.length * 6.6) + 10);
}

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
  color,
  glow = false,
}: {
  series: SeriesPoint[];
  previousSeries?: SeriesPoint[];
  height?: number;
  format?: MetricFormat;
  showBrush?: boolean;
  color?: string;
  /**
   * New IRIS only: the Figma kit's revenue-chart accent. A soft ink haze sits
   * under the line (radial, strongest around the upper middle, fading toward
   * the edges and baseline) and the line fades in from the left. Meant for a
   * page's headline revenue chart.
   */
  glow?: boolean;
}) {
  const chart = useChartTheme();
  const isNew = useIsNewUi();
  const lineColor = color ?? chart.primary;
  // Unique per chart so several on one page don't share gradient defs.
  const uid = useId().replace(/:/g, "");
  const glowId = `glow-${uid}`;
  const lineGradId = `line-${uid}`;
  const rows = series.map((p, i) => ({
    date: p.date,
    current: p.value,
    previous: previousSeries?.[i]?.value ?? null,
    previousDate: previousSeries?.[i]?.date ?? null,
  }));

  const axisWidth = yAxisWidth(
    rows.flatMap((r) => [r.current, r.previous ?? 0]),
    format,
  );
  const kitGlow = glow && isNew;
  // A gradient stroke on a perfectly flat line has a zero-height bounding box
  // and wouldn't paint, so flat series keep the solid colour.
  const flat = rows.every((r) => r.current === rows[0]?.current);

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
    <div style={{ height }} className="w-full max-sm:max-h-[240px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="inkArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chart.areaTop} />
              <stop offset="100%" stopColor={chart.areaBottom} />
            </linearGradient>
            {kitGlow && (
              <>
                {/* Figma node 43:1497: ink at 0.6 under a radial 0.08 → 0 mask,
                    centred a quarter of the way down the plot. */}
                <radialGradient id={glowId} cx="0.49" cy="0.27" r="0.65">
                  <stop offset="0" stopColor={chart.primary} stopOpacity={0.14} />
                  <stop offset="0.6" stopColor={chart.primary} stopOpacity={0.06} />
                  <stop offset="1" stopColor={chart.primary} stopOpacity={0} />
                </radialGradient>
                <linearGradient id={lineGradId} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor={lineColor} stopOpacity={0.4} />
                  <stop offset="1" stopColor={lineColor} stopOpacity={1} />
                </linearGradient>
              </>
            )}
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
            width={axisWidth}
          />
          <Tooltip
            cursor={{ stroke: chart.muted, strokeWidth: 1 }}
            contentStyle={{
              borderRadius: 10,
              border: `1px solid ${chart.grid}`,
              background: chart.surface,
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
            stroke={kitGlow && !flat ? `url(#${lineGradId})` : lineColor}
            strokeWidth={2}
            fill={kitGlow ? `url(#${glowId})` : "url(#inkArea)"}
            dot={false}
            activeDot={{ r: 3, fill: lineColor }}
            isAnimationActive={false}
          />
          {showBrush && (
            <Brush
              dataKey="date"
              height={24}
              stroke={chart.muted}
              fill={chart.surface}
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
  colors,
}: {
  rows: Array<Record<string, string | number | null>>;
  keys: { key: string; label: string }[];
  height?: number;
  format?: MetricFormat;
  /** Overrides the default ink ramp — use when series must be told apart. */
  colors?: readonly string[];
}) {
  const chart = useChartTheme();
  const palette = colors?.length ? colors : [chart.primary, chart.secondary, chart.tertiary];
  const axisWidth = yAxisWidth(
    rows.flatMap((r) => keys.map((k) => Number(r[k.key] ?? 0))),
    format,
  );
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
    <div style={{ height }} className="w-full max-sm:max-h-[240px]">
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
            width={axisWidth}
          />
          <Tooltip
            cursor={{ stroke: chart.muted, strokeWidth: 1 }}
            contentStyle={{
              borderRadius: 10,
              border: `1px solid ${chart.grid}`,
              background: chart.surface,
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
