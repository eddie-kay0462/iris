import { useUiMode } from "@/lib/ui/UiModeContext";

/**
 * Monochrome chart + metric design tokens.
 *
 * The admin uses shades of ink (slate-900 → slate-200) rather than bright
 * accent colors for a premium, Shopify-like look. Use `useChartTheme().primary` for the
 * main series, `chart.comparison` for previous-period overlays, and the
 * `donut` ramp for categorical splits.
 */

export type ChartPalette = {
  primary: string;
  secondary: string;
  tertiary: string;
  comparison: string;
  muted: string;
  grid: string;
  axis: string;
  positive: string;
  negative: string;
  areaTop: string;
  areaBottom: string;
  /** Resting fill for bars. */
  bar: string;
  /** Card background, for gaps between donut slices and tooltips. */
  surface: string;
  donut: readonly string[];
  channels: readonly string[];
};

/**
 * Light palette (Figma "Dashboard UI Kit"): ink line, soft blue dashed
 * comparison, pale bars and a pastel categorical ramp.
 */
export const chartLight: ChartPalette = {
  primary: "#1c1c1c",
  secondary: "#a8c5da",
  tertiary: "#c6c7f8",
  comparison: "#a8c5da",
  muted: "#d2d2d2",
  grid: "#efefef",
  axis: "#a4a4a4",
  positive: "#1c1c1c",
  negative: "#d9534f",
  areaTop: "rgba(28, 28, 28, 0.06)",
  areaBottom: "rgba(28, 28, 28, 0)",
  bar: "#e8e8e8",
  surface: "#ffffff",
  donut: ["#1c1c1c", "#a8c5da", "#e8d9c0", "#e8c9c0", "#c6c7f8", "#baedbd"],
  channels: ["#1c1c1c", "#95a4fc", "#e2b77e", "#7fc8a9"],
};

export const chartDark: ChartPalette = {
  primary: "#f4f4f4",
  secondary: "#a8c5da",
  tertiary: "#c6c7f8",
  comparison: "#6f93ad",
  muted: "#474747",
  grid: "#2a2a2a",
  axis: "#7a7a7a",
  positive: "#f4f4f4",
  negative: "#ff8a8a",
  areaTop: "rgba(255, 255, 255, 0.08)",
  areaBottom: "rgba(255, 255, 255, 0)",
  bar: "#2f2f2f",
  surface: "#1c1c1c",
  donut: ["#f4f4f4", "#a8c5da", "#e8d9c0", "#e8c9c0", "#c6c7f8", "#baedbd"],
  channels: ["#f4f4f4", "#95a4fc", "#e2b77e", "#7fc8a9"],
};

/** The palette for the active light / dark theme. */
export function useChartTheme(): ChartPalette {
  const { resolvedTheme } = useUiMode();
  return resolvedTheme === "dark" ? chartDark : chartLight;
}

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
