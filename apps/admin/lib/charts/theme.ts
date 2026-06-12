/**
 * Monochrome chart + metric design tokens.
 *
 * The admin uses shades of ink (slate-900 → slate-200) rather than bright
 * accent colors for a premium, Shopify-like look. Use `chart.primary` for the
 * main series, `chart.comparison` for previous-period overlays, and the
 * `donut` ramp for categorical splits.
 */

export const chart = {
  primary: "#0f172a", // slate-900 — main series
  secondary: "#475569", // slate-600 — second series
  tertiary: "#94a3b8", // slate-400 — third series
  comparison: "#94a3b8", // dashed previous-period line
  muted: "#cbd5e1", // slate-300
  grid: "#e2e8f0", // slate-200
  axis: "#94a3b8", // slate-400 tick labels
  positive: "#0f172a", // deltas up — ink, not green
  negative: "#9f1239", // deltas down — restrained rose
  areaTop: "rgba(15, 23, 42, 0.08)",
  areaBottom: "rgba(15, 23, 42, 0)",
  donut: ["#0f172a", "#475569", "#64748b", "#94a3b8", "#cbd5e1", "#e2e8f0"],
} as const;

export type MetricFormat = "currency" | "number" | "percent" | "text";

export function formatGHS(v: number): string {
  return `GH₵${v.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatGHSShort(v: number): string {
  const sign = v < 0 ? "-" : "";
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${sign}GH₵${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}GH₵${(abs / 1_000).toFixed(1)}k`;
  return `${sign}GH₵${abs.toFixed(0)}`;
}

export function formatMetric(v: number | string | null | undefined, format: MetricFormat): string {
  if (v == null) return "—";
  if (typeof v === "string") return v;
  switch (format) {
    case "currency":
      return formatGHS(v);
    case "percent":
      return `${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
    case "number":
      return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
    default:
      return String(v);
  }
}

/** Compact variant for chart axes. */
export function formatMetricShort(v: number, format: MetricFormat): string {
  if (format === "currency") return formatGHSShort(v);
  if (format === "percent") return `${v.toFixed(0)}%`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
  return v.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

export function formatDateLabel(iso: string): string {
  // "2026-06-03" → "Jun 3" / "2026-06" → "Jun 2026"
  if (/^\d{4}-\d{2}$/.test(iso)) {
    const d = new Date(`${iso}-01T00:00:00Z`);
    return d.toLocaleDateString(undefined, { month: "short", year: "numeric", timeZone: "UTC" });
  }
  const d = new Date(`${iso}T00:00:00Z`);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
}
