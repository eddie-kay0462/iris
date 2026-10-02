import { useUiMode } from "@/lib/ui/UiModeContext";

/**
 * Monochrome chart + metric design tokens.
 *
 * The admin uses shades of ink (slate-900 → slate-200) rather than bright
 * accent colors for a premium, Shopify-like look. Use `chart.primary` for the
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
  /** Resting fill for bars (pale in new IRIS). */
  bar: string;
  /** Card background, for gaps between donut slices and tooltips. */
  surface: string;
  donut: readonly string[];
  channels: readonly string[];
};

export const chart: ChartPalette = {
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
  bar: "#94a3b8",
  surface: "#ffffff",
  donut: ["#0f172a", "#475569", "#64748b", "#94a3b8", "#cbd5e1", "#e2e8f0"],
  /**
   * Sales channels are the one split that has to be readable at a glance, and
   * adjacent steps of the ink ramp are too close to tell apart in a donut. These
   * stay dark and desaturated so they still read as premium rather than as a
   * default category palette, but they separate by hue as well as by value.
   * Order matches SALES_CHANNELS: online, pop-up, walk-in, B2B.
   */
  channels: ["#0f172a", "#0e7490", "#b45309", "#6d28d9"],
};

/**
 * New IRIS palette (Figma "Dashboard UI Kit"): ink line, soft blue dashed
 * comparison, pale bars and a pastel categorical ramp.
 */
export const chartNew: ChartPalette = {
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

export const chartNewDark: ChartPalette = {
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

/** The palette for the active interface: classic, new IRIS light or dark. */
export function useChartTheme(): ChartPalette {
  const { ui, resolvedTheme } = useUiMode();
  if (ui !== "new") return chart;
  return resolvedTheme === "dark" ? chartNewDark : chartNew;
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
