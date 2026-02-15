"use client";

interface BarChartProps {
  data: Record<string, number>;
  color?: string;
  formatValue?: (v: number) => string;
  height?: number;
}

export function BarChart({
  data,
  color = "#3b82f6",
  formatValue = (v) => String(v),
  height = 220,
}: BarChartProps) {
  const entries = Object.entries(data).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) {
    return <p className="text-sm text-slate-500">No data in this period.</p>;
  }

  const values = entries.map(([, v]) => v);
  const maxVal = Math.max(...values, 1);

  const padding = { top: 12, right: 12, bottom: 40, left: 60 };
  const chartWidth = 500;
  const chartH = height - padding.top - padding.bottom;
  const barAreaWidth = chartWidth - padding.left - padding.right;
  const gap = Math.max(1, entries.length > 20 ? 1 : 2);
  const barWidth = Math.max(
    2,
    (barAreaWidth - gap * (entries.length - 1)) / entries.length,
  );

  // y-axis ticks (4 ticks)
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxVal * f));

  return (
    <svg
      viewBox={`0 0 ${chartWidth} ${height}`}
      className="w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Grid lines */}
      {ticks.map((tick, i) => {
        const y = padding.top + chartH - (tick / maxVal) * chartH;
        return (
          <g key={i}>
            <line
              x1={padding.left}
              y1={y}
              x2={chartWidth - padding.right}
              y2={y}
              stroke="#e2e8f0"
              strokeWidth={0.5}
            />
            <text
              x={padding.left - 6}
              y={y + 3}
              fill="#94a3b8"
              fontSize={8}
              textAnchor="end"
            >
              {formatValue(tick)}
            </text>
          </g>
        );
      })}

      {/* Bars */}
      {entries.map(([label, value], i) => {
        const barH = maxVal > 0 ? (value / maxVal) * chartH : 0;
        const x = padding.left + i * (barWidth + gap);
        const y = padding.top + chartH - barH;

        // Show label every N bars to avoid overlap
        const labelInterval = Math.max(1, Math.floor(entries.length / 10));
        const showLabel = i % labelInterval === 0 || i === entries.length - 1;

        return (
          <g key={label}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(barH, value > 0 ? 1 : 0)}
              fill={color}
              rx={1}
              className="transition-all"
            >
              <title>{`${label}: ${formatValue(value)}`}</title>
            </rect>
            {showLabel && (
              <text
                x={x + barWidth / 2}
                y={height - padding.bottom + 14}
                fill="#64748b"
                fontSize={7}
                textAnchor="middle"
              >
                {label.slice(5)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
