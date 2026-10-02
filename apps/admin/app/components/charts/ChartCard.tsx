"use client";

import { ReactNode } from "react";
import { useIsNewUi } from "@/lib/ui/UiModeContext";

/** Standard analytics card: small-caps title, optional big value + delta, body. */
export function ChartCard({
  title,
  value,
  delta,
  action,
  note,
  children,
  className = "",
}: {
  title: string;
  value?: string;
  delta?: ReactNode;
  action?: ReactNode;
  note?: string;
  children?: ReactNode;
  className?: string;
}) {
  const isNew = useIsNewUi();
  if (isNew) {
    return (
      <div className={`min-w-0 rounded-2xl border border-[var(--iris-line)] bg-white p-4 shadow-sm sm:p-6 ${className}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
            {value !== undefined && (
              <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="text-2xl font-semibold tabular-nums leading-9 text-slate-900">{value}</p>
                {delta}
              </div>
            )}
          </div>
          {action}
        </div>
        {children && <div className="mt-4">{children}</div>}
        {note && <p className="mt-3 text-xs text-[var(--iris-muted)]">{note}</p>}
      </div>
    );
  }
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
          {value !== undefined && (
            <div className="mt-1.5 flex items-baseline gap-2">
              <p className="text-2xl font-bold tabular-nums leading-none text-slate-900">{value}</p>
              {delta}
            </div>
          )}
        </div>
        {action}
      </div>
      {children && <div className="mt-4">{children}</div>}
      {note && <p className="mt-3 text-[11px] text-slate-400">{note}</p>}
    </div>
  );
}
