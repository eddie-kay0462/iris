"use client";

import { useState, useRef, useEffect } from "react";

interface RevenueLineChartProps {
  data: Record<string, number>;
  height?: number;
  color?: string;
  formatValue?: (v: number) => string;
}

export function RevenueLineChart({
  data,
  height = 260,
  color = "#3b82f6",
  formatValue = (v) =>
    `GH₵${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
}: RevenueLineChartProps) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    label: string;
    value: number;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const entries = Object.entries(data).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  // Auto-scroll to the right whenever data changes
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollLeft = containerRef.current.scrollWidth;
    }
  }, [entries.length]);

  if (entries.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-slate-400">
        No revenue data for this period.
      </div>
    );
  }

  // Set dynamic width based on number of points (min 30px per point) to allow scrolling
  const minWidthPerPoint = 24;
  const W = Math.max(600, entries.length * minWidthPerPoint);
  const H = height;
  const pad = { top: 20, right: 20, bottom: 44, left: 64 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;

  const values = entries.map(([, v]) => v);
  const maxVal = Math.max(...values, 1);
  const minVal = 0;

  const xOf = (i: number) =>
    pad.left + (entries.length <= 1 ? innerW / 2 : (i / (entries.length - 1)) * innerW);
  const yOf = (v: number) =>
    pad.top + innerH - ((v - minVal) / (maxVal - minVal)) * innerH;

  // Build smooth cubic bezier path
  const points = entries.map(([, v], i) => ({ x: xOf(i), y: yOf(v) }));

  function buildSmoothPath(pts: { x: number; y: number }[]) {
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const cp1x = pts[i].x + (pts[i + 1].x - pts[i].x) * 0.4;
      const cp1y = pts[i].y;
      const cp2x = pts[i + 1].x - (pts[i + 1].x - pts[i].x) * 0.4;
      const cp2y = pts[i + 1].y;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${pts[i + 1].x} ${pts[i + 1].y}`;
    }
    return d;
  }

  const linePath = buildSmoothPath(points);
  const areaPath =
    linePath +
    ` L ${points[points.length - 1].x} ${pad.top + innerH}` +
    ` L ${points[0].x} ${pad.top + innerH} Z`;

  // Y-axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => maxVal * f);

  // X-axis labels — show at most 8
  const labelInterval = Math.max(1, Math.ceil(entries.length / 8));

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * W;
    // Find nearest point
    let closest = 0;
    let minDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - mouseX);
      if (dist < minDist) {
        minDist = dist;
        closest = i;
      }
    });
    setTooltip({
      x: points[closest].x,
      y: points[closest].y,
      label: entries[closest][0],
      value: entries[closest][1],
    });
  };

  const gradientId = "rev-area-gradient";

  return (
    <div ref={containerRef} className="relative w-full overflow-x-auto overflow-y-hidden custom-scrollbar">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ minWidth: `${W}px`, height: `${H}px` }}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.18} />
            <stop offset="100%" stopColor={color} stopOpacity={0.01} />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yTicks.map((tick, i) => {
          const y = yOf(tick);
          return (
            <g key={i}>
              <line
                x1={pad.left}
                y1={y}
                x2={W - pad.right}
                y2={y}
                stroke="#e2e8f0"
                strokeWidth={0.8}
                strokeDasharray={i === 0 ? "0" : "4 3"}
              />
              <text
                x={pad.left - 8}
                y={y + 4}
                fill="#94a3b8"
                fontSize={9}
                textAnchor="end"
              >
                {tick === 0
                  ? "0"
                  : tick >= 1000
                  ? `${(tick / 1000).toFixed(0)}k`
                  : tick.toFixed(0)}
              </text>
            </g>
          );
        })}

        {/* X-axis labels */}
        {entries.map(([label], i) => {
          if (i % labelInterval !== 0 && i !== entries.length - 1) return null;
          const x = xOf(i);
          const shortLabel = label.slice(5); // "YYYY-MM-DD" → "MM-DD"
          return (
            <text
              key={label}
              x={x}
              y={H - pad.bottom + 16}
              fill="#94a3b8"
              fontSize={8}
              textAnchor="middle"
            >
              {shortLabel}
            </text>
          );
        })}

        {/* Area fill */}
        <path d={areaPath} fill={`url(#${gradientId})`} />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Tooltip vertical line */}
        {tooltip && (
          <line
            x1={tooltip.x}
            y1={pad.top}
            x2={tooltip.x}
            y2={pad.top + innerH}
            stroke={color}
            strokeWidth={1}
            strokeDasharray="4 3"
            opacity={0.5}
          />
        )}

        {/* Hover dot */}
        {tooltip && (
          <>
            <circle cx={tooltip.x} cy={tooltip.y} r={5} fill="white" stroke={color} strokeWidth={2} />
          </>
        )}
      </svg>

      {/* Floating tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none absolute -translate-y-full rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg text-xs"
          style={{
            left: `${Math.max(0, tooltip.x)}px`,
            top: `${(tooltip.y / H) * 100}%`,
            transform: "translateX(-50%) translateY(calc(-100% - 10px))",
            zIndex: 10,
          }}
        >
          <p className="font-semibold text-slate-900">{formatValue(tooltip.value)}</p>
          <p className="text-slate-500 mt-0.5">{tooltip.label}</p>
        </div>
      )}
    </div>
  );
}
