import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type StatsCardProps = {
  label: string;
  value: string;
  helperText?: ReactNode;
  icon?: LucideIcon;
};

export function StatsCard({ label, value, helperText, icon: Icon }: StatsCardProps) {
  return (
    <div className="relative rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      {Icon ? (
        <Icon className="absolute right-4 top-4 h-5 w-5 text-slate-400" />
      ) : null}
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      {helperText ? (
        <div className="mt-2 text-xs text-slate-500">{helperText}</div>
      ) : null}
    </div>
  );
}
