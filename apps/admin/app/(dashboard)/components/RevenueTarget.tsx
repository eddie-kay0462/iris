"use client";

import { Target } from "lucide-react";
import Link from "next/link";
import { useRevenueTarget } from "@/lib/api/orders";

interface RevenueTargetProps {
  ytdRevenue: number;
  year: number;
}

export function RevenueTarget({ ytdRevenue, year }: RevenueTargetProps) {
  const { data: target, isLoading } = useRevenueTarget(year);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-5 animate-pulse min-h-[140px]" />
    );
  }

  if (target === null || target === undefined) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
            <Target className="h-4 w-4 text-slate-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700">Set a revenue target</p>
            <p className="text-xs text-slate-400 mt-0.5">Track your {year} goal</p>
          </div>
        </div>
        <Link
          href="/settings/general"
          className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Go to Settings
        </Link>
      </div>
    );
  }

  const pct = target ? Math.min((ytdRevenue / target) * 100, 100) : 0;
  const overTarget = target ? ytdRevenue >= target : false;
  const remaining = target ? Math.max(target - ytdRevenue, 0) : 0;

  const barColor = overTarget
    ? "#22c55e"
    : pct > 66
    ? "#3b82f6"
    : pct > 33
    ? "#f59e0b"
    : "#6366f1";

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{ backgroundColor: `${barColor}15` }}
          >
            <Target className="h-4 w-4" style={{ color: barColor }} />
          </div>
          <p className="text-sm font-semibold text-slate-800">{year} Revenue Target</p>
        </div>
      </div>

      {/* Numbers */}
      <div className="flex items-baseline justify-between">
        <div>
          <p
            className="text-2xl font-bold tabular-nums"
            style={{ color: barColor }}
          >
            GH₵{ytdRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">YTD revenue</p>
        </div>
        <div className="text-right">
          <div>
            <p className="text-lg font-semibold text-slate-700 tabular-nums">
              GH₵{target!.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Target</p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, backgroundColor: barColor }}
          />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium" style={{ color: barColor }}>
            {overTarget ? "🎉 Target reached!" : `${pct.toFixed(1)}% achieved`}
          </p>
          {!overTarget && (
            <p className="text-xs text-slate-400">
              GH₵{remaining.toLocaleString(undefined, { maximumFractionDigits: 0 })} to go
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
