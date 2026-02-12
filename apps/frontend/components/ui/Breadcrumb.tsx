"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbProps = {
  items?: BreadcrumbItem[];
};

function segmentToLabel(segment: string): string {
  return segment
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  const pathname = usePathname();

  const crumbs: BreadcrumbItem[] = items ?? (() => {
    const segments = pathname.split("/").filter(Boolean);
    let href = "";
    return segments.map((seg, i) => {
      href += `/${seg}`;
      return {
        label: segmentToLabel(seg),
        href: i < segments.length - 1 ? href : undefined,
      };
    });
  })();

  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-slate-500">
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
          {crumb.href ? (
            <Link
              href={crumb.href}
              className="hover:text-slate-900 transition-colors"
            >
              {crumb.label}
            </Link>
          ) : (
            <span className="text-slate-900 font-medium">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
