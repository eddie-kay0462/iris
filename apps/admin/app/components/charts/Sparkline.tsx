"use client";

import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";
import { useChartTheme } from "@/lib/charts/theme";

/** Tiny axis-less trend line for KPI cards. */
export function Sparkline({
  data,
  height = 32,
  color,
}: {
  /** date → value map or pre-built array */
  data: Record<string, number> | { value: number }[];
  height?: number;
  color?: string;
}) {
  const chart = useChartTheme();
  const rows = Array.isArray(data)
    ? data
    : Object.entries(data)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, value]) => ({ value }));

  if (rows.length < 2) {
    return <div style={{ height }} className="w-full rounded bg-slate-50" />;
  }

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color ?? chart.primary}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
