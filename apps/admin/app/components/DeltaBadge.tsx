"use client";

import { ArrowDownRight, ArrowUpRight, TrendingDown, TrendingUp } from "lucide-react";
import { useIsNewUi } from "@/lib/ui/UiModeContext";

/**
 * Period-over-period delta. Monochrome: up is ink, down is a restrained rose.
 * `invert` flips the colors for metrics where down is good (e.g. abandonment).
 */
export function DeltaBadge({
  current,
  previous,
  invert = false,
  suffix,
}: {
  current: number;
  previous: number | null | undefined;
  invert?: boolean;
  suffix?: string;
}) {
  const isNew = useIsNewUi();
  if (previous == null || (previous === 0 && current === 0)) return null;
  if (previous === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-slate-900">
        <ArrowUpRight className="h-3 w-3" />
        New
      </span>
    );
  }
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const up = pct >= 0;
  const good = invert ? !up : up;
  if (isNew) {
    // Kit: "+11.02% ↗" in ink; a bad move is tinted, not shouted.
    const Trend = up ? TrendingUp : TrendingDown;
    return (
      <span
        className={`inline-flex items-center gap-1 text-xs tabular-nums ${
          good ? "text-slate-900" : "text-[var(--iris-danger-fg)]"
        }`}
      >
        {up ? "+" : "-"}
        {Math.abs(pct).toFixed(2)}%{suffix ? ` ${suffix}` : ""}
        <Trend className="h-4 w-4" strokeWidth={1.5} />
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${
        good ? "text-slate-900" : "text-rose-800"
      }`}
    >
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(pct).toFixed(1)}%{suffix ? ` ${suffix}` : ""}
    </span>
  );
}
