"use client";

import type { LucideIcon } from "lucide-react";
import { useIsNewUi } from "@/lib/ui/UiModeContext";
import type { ReactNode } from "react";

type StatsCardProps = {
  label: string;
  value: string | number;
  helperText?: ReactNode;
  icon?: LucideIcon;
  color?: string;
};

export function StatsCard({ label, value, helperText, icon: Icon, color = "text-slate-900" }: StatsCardProps) {
  const isNew = useIsNewUi();
  if (isNew) {
    // Kit card: plain label, big value, supporting line underneath.
    return (
      <div className="flex min-h-[112px] min-w-0 flex-col justify-center gap-2 rounded-2xl border border-[var(--iris-line)] bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs leading-[18px] text-slate-900">{label}</p>
          {Icon ? <Icon className="h-4 w-4 text-[var(--iris-muted)]" strokeWidth={1.5} /> : null}
        </div>
        <p className={`text-2xl font-semibold leading-9 tabular-nums [overflow-wrap:anywhere] ${color}`}>{value}</p>
        {helperText ? (
          <div className="text-xs leading-[18px] text-[var(--iris-muted)]">{helperText}</div>
        ) : null}
      </div>
    );
  }
  return (
    <div className="relative rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      {Icon ? (
        <Icon className="absolute right-4 top-4 h-5 w-5 text-slate-400" />
      ) : null}
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${color}`}>{value}</p>
      {helperText ? (
        <div className="mt-2 text-xs text-slate-500">{helperText}</div>
      ) : null}
    </div>
  );
}
