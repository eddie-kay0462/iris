"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Info, X } from "lucide-react";

/**
 * Small building blocks from the Figma kit, used by the pages that get the
 * fuller new-IRIS treatment (Products, Orders, Customers).
 */

/** "Active | All Products" — text tabs with an ink underline on the current one. */
export function TabsUnderline<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex max-w-full items-center gap-1 overflow-x-auto border-b border-[var(--iris-line)]" role="tablist">
      {tabs.map((t, i) => {
        const active = t.value === value;
        return (
          <span key={t.value} className="flex items-center">
            {i > 0 && <span className="mx-1 h-4 w-px bg-[var(--iris-line)]" />}
            <button
              role="tab"
              aria-selected={active}
              onClick={() => onChange(t.value)}
              className={`-mb-px whitespace-nowrap border-b px-2 py-1.5 text-sm transition-colors ${
                active
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-[var(--iris-muted)] hover:text-slate-900"
              }`}
            >
              {t.label}
              {t.count != null && <span className="ml-1.5 text-xs text-[var(--iris-muted)]">{t.count}</span>}
            </button>
          </span>
        );
      })}
    </div>
  );
}

/** Dismissible info strip. Dismissal is remembered per `storageKey` in this browser. */
export function InfoBanner({ storageKey, children }: { storageKey: string; children: React.ReactNode }) {
  const key = `iris_banner_${storageKey}`;
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    try {
      setHidden(localStorage.getItem(key) === "1");
    } catch {
      setHidden(false);
    }
  }, [key]);

  if (hidden) return null;
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[var(--iris-line)] bg-[var(--iris-surface)] px-4 py-3 text-xs text-slate-900 sm:px-6 sm:py-4">
      <Info className="h-4 w-4 shrink-0 fill-slate-900 text-[var(--iris-bg)]" />
      <p className="flex-1 leading-[18px]">{children}</p>
      <button
        onClick={() => {
          setHidden(true);
          try {
            localStorage.setItem(key, "1");
          } catch {}
        }}
        aria-label="Dismiss"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[var(--iris-muted)] hover:bg-[var(--iris-hover)] hover:text-slate-900 pointer-coarse:h-9 pointer-coarse:w-9"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Round icon-only toolbar button (sort / filter / history in the kit). */
export function ToolbarIcon({
  icon: Icon,
  label,
  onClick,
  active,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`flex h-7 w-7 items-center justify-center rounded-lg text-slate-900 transition-colors hover:bg-[var(--iris-hover)] pointer-coarse:h-9 pointer-coarse:w-9 ${
        active ? "bg-[var(--iris-hover)]" : ""
      }`}
    >
      <Icon className="h-5 w-5" strokeWidth={1.5} />
    </button>
  );
}

const pillBase =
  "inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full px-4 text-xs font-medium transition-colors disabled:opacity-50";

/** Outline pill ("Import" in the kit). */
export function OutlinePill({
  icon: Icon,
  children,
  onClick,
  href,
}: {
  icon?: LucideIcon;
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
}) {
  const cls = `${pillBase} border border-[var(--iris-line)] text-slate-900 hover:bg-[var(--iris-hover)]`;
  const inner = (
    <>
      {Icon && <Icon className="h-4 w-4" strokeWidth={1.5} />}
      {children}
    </>
  );
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <button onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

/** Solid ink pill ("Add Product" in the kit). */
export function PrimaryPill({
  icon: Icon,
  children,
  onClick,
  href,
}: {
  icon?: LucideIcon;
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
}) {
  const cls = `${pillBase} bg-slate-900 text-white hover:bg-slate-700`;
  const inner = (
    <>
      {Icon && <Icon className="h-4 w-4" strokeWidth={1.5} />}
      {children}
    </>
  );
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <button onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

/** The kit's grouped row actions: icons inside one outlined pill, separated by hairlines. */
export function IconActionGroup({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="inline-flex items-center rounded-full border border-[var(--iris-line)] px-1.5 py-1 [&>*+*]:border-l [&>*+*]:border-[var(--iris-line)]"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

export function IconAction({
  icon: Icon,
  label,
  onClick,
  href,
}: {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  href?: string;
}) {
  const cls =
    "flex h-7 w-8 items-center justify-center text-slate-900 transition-colors first:rounded-l-full last:rounded-r-full hover:bg-[var(--iris-hover)] pointer-coarse:h-9 pointer-coarse:w-10";
  return href ? (
    <Link href={href} className={cls} title={label} aria-label={label}>
      <Icon className="h-4 w-4" strokeWidth={1.5} />
    </Link>
  ) : (
    <button onClick={onClick} className={cls} title={label} aria-label={label}>
      <Icon className="h-4 w-4" strokeWidth={1.5} />
    </button>
  );
}
