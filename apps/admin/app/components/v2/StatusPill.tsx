"use client";

import type { LucideIcon } from "lucide-react";
import {
  Archive,
  Check,
  Circle,
  CircleDashed,
  Hourglass,
  Loader,
  RotateCcw,
  Truck,
  X,
} from "lucide-react";

export type StatusTone = "pending" | "success" | "danger" | "info" | "violet" | "neutral";

/** Tone → kit colour pair (CSS vars defined in globals.css, light + dark). */
export const TONE_CLASSES: Record<StatusTone, string> = {
  pending: "bg-[var(--iris-pending-bg)] text-[var(--iris-pending-fg)]",
  success: "bg-[var(--iris-success-bg)] text-[var(--iris-success-fg)]",
  danger: "bg-[var(--iris-danger-bg)] text-[var(--iris-danger-fg)]",
  info: "bg-[var(--iris-info-bg)] text-[var(--iris-info-fg)]",
  violet: "bg-[var(--iris-violet-bg)] text-[var(--iris-violet-fg)]",
  neutral: "bg-[var(--iris-neutral-bg)] text-[var(--iris-neutral-fg)]",
};

const STATUS_STYLE: Record<string, { tone: StatusTone; icon: LucideIcon }> = {
  // Success
  paid: { tone: "success", icon: Check },
  delivered: { tone: "success", icon: Check },
  completed: { tone: "success", icon: Check },
  active: { tone: "success", icon: Check },
  approved: { tone: "success", icon: Check },
  recovered: { tone: "success", icon: Check },
  sent: { tone: "success", icon: Check },
  // In flight
  pending: { tone: "pending", icon: Loader },
  awaiting_payment: { tone: "pending", icon: Hourglass },
  on_hold: { tone: "pending", icon: Hourglass },
  in_production: { tone: "pending", icon: Loader },
  draft: { tone: "neutral", icon: CircleDashed },
  processing: { tone: "info", icon: Loader },
  confirmed: { tone: "info", icon: Check },
  shipped: { tone: "violet", icon: Truck },
  // Stopped
  cancelled: { tone: "danger", icon: X },
  failed: { tone: "danger", icon: X },
  abandoned: { tone: "danger", icon: X },
  overdue: { tone: "danger", icon: Hourglass },
  refunded: { tone: "neutral", icon: RotateCcw },
  archived: { tone: "neutral", icon: Archive },
};

export function statusStyle(status: string): { tone: StatusTone; icon: LucideIcon } {
  return STATUS_STYLE[status] ?? { tone: "neutral", icon: Circle };
}

function titleCase(s: string) {
  const t = s.replace(/_/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Kit status pill: soft tint, icon, label. */
export function StatusPill({
  status,
  label,
  tone,
}: {
  status: string;
  label?: string;
  /** Override the tone the status would get by default. */
  tone?: StatusTone;
}) {
  const style = statusStyle(status);
  const Icon = style.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium leading-none ${
        TONE_CLASSES[tone ?? style.tone]
      }`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
      {label ?? titleCase(status)}
    </span>
  );
}
