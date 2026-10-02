"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Star, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { UserRole } from "@/lib/rbac/permissions";
import { Avatar } from "../Avatar";
import { activeHref, flattenNav, navGroupsForRole, type NavItem } from "../nav";
import type { Favorite } from "./useShellPrefs";

type SidebarV2Props = {
  role: UserRole;
  open: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
  displayName: string;
  avatarUrl: string | null;
  favorites: Favorite[];
  /** Shown under the name on the user tile. */
  roleLabel: string;
  /** The user tile opens the "Your account" modal. */
  onOpenProfile: () => void;
};

/** Shared ease-out for the sidebar's open/collapse motion: quick start, soft landing. */
const EASE = "ease-[cubic-bezier(0.32,0.72,0,1)]";

/** Kit-style left sidebar: user badge, grouped sections, chevron sub-pages. */
export function SidebarV2({
  role,
  open,
  mobileOpen,
  onMobileClose,
  displayName,
  avatarUrl,
  favorites,
  roleLabel,
  onOpenProfile,
}: SidebarV2Props) {
  const pathname = usePathname();
  const groups = useMemo(() => navGroupsForRole(role), [role]);
  const current = activeHref(pathname, flattenNav(groups));

  // Transitions switch on only after the first paint. The open/collapsed
  // preference is read from localStorage after mount, so without this a
  // collapsed sidebar would replay the collapse animation on every page load.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setReady(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, []);

  const content = (
    <div className="flex h-full flex-col justify-between p-4">
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onOpenProfile}
            aria-label={`Open your account — ${displayName}`}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-lg p-2 text-left transition-colors hover:bg-[var(--iris-hover)]"
          >
            <Avatar url={avatarUrl} name={displayName} size={32} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-slate-900">{displayName}</span>
              <span className="block truncate text-[10px] uppercase leading-[14px] tracking-[0.4px] text-[var(--iris-muted)]">
                {roleLabel}
              </span>
            </span>
          </button>
          <button
            onClick={onMobileClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-[var(--iris-hover)] md:hidden"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="-mx-1 min-h-0 flex-1 space-y-4 overflow-y-auto px-1 pb-4">
          {favorites.length > 0 && (
            <Section label="Favorites">
              {favorites.map((f) => (
                <Link
                  key={f.href}
                  href={f.href}
                  onClick={onMobileClose}
                  className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm transition-colors ${
                    pathname === f.href
                      ? "bg-[var(--iris-hover)] text-slate-900"
                      : "text-slate-600 hover:bg-[var(--iris-hover)] hover:text-slate-900"
                  }`}
                >
                  <Star className="h-3.5 w-3.5 shrink-0 fill-current text-slate-400" />
                  <span className="truncate">{f.label}</span>
                </Link>
              ))}
            </Section>
          )}

          {groups.map((group) => (
            <Section key={group.label} label={group.label}>
              {group.items.map((item) => (
                <SidebarTab
                  key={item.href}
                  item={item}
                  current={current}
                  onNavigate={onMobileClose}
                />
              ))}
            </Section>
          ))}
        </nav>
      </div>

      <div className="flex items-center justify-center gap-2 pt-2">
        <BrandMark />
        <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">IRIS</span>
      </div>
    </div>
  );

  // Collapsed: the kit's 68px rail (Figma Calendar frame, node 17:109726).
  // Avatar on top, icon-only tabs in the middle with the groups set apart by
  // spacing alone, and the wreath at the bottom. The header's sidebar button
  // expands it again.
  // Sub-pages fold into their parent, which stays lit while one is open.
  const rail = (
    <div className="flex h-full flex-col items-center p-4">
      <button
        type="button"
        onClick={onOpenProfile}
        title={displayName}
        aria-label={`Open your account — ${displayName}`}
        className="shrink-0 rounded-full ring-offset-2 ring-offset-[var(--iris-bg)] transition hover:ring-2 hover:ring-[var(--iris-line)]"
      >
        <Avatar url={avatarUrl} name={displayName} size={32} />
      </button>

      <nav className="flex min-h-0 w-full flex-1 flex-col items-center overflow-y-auto py-4">
        <div className="my-auto flex flex-col items-center gap-4">
          {favorites.length > 0 && (
            <RailGroup>
              {favorites.map((f) => (
                <RailTab
                  key={f.href}
                  href={f.href}
                  label={f.label}
                  icon={Star}
                  active={pathname === f.href}
                />
              ))}
            </RailGroup>
          )}
          {groups.map((group) => (
            <RailGroup key={group.label}>
              {group.items.map((item) => (
                <RailTab
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={
                    item.href === current || (item.children ?? []).some((c) => c.href === current)
                  }
                />
              ))}
            </RailGroup>
          ))}
        </div>
      </nav>

      {/* Same spot as the open sidebar's footer, so the mark holds still through the crossfade. */}
      <div className="flex shrink-0 justify-center pt-2">
        <BrandMark />
      </div>
    </div>
  );

  return (
    <>
      {/*
        Open ⇄ collapsed is one continuous move: the aside's width glides
        between 212px and 68px while the two layers inside crossfade. The
        outgoing layer leaves fast (so it's mostly gone before the edge
        reaches it), the incoming one arrives just behind the width, and the
        full layer stays 212px wide so the narrowing edge clips its labels
        rather than reflowing them. The hidden layer is inert, so keyboard and
        screen-reader users only ever reach the visible one.
      */}
      <aside
        className={`relative hidden shrink-0 overflow-hidden border-r border-[var(--iris-line)] bg-[var(--iris-bg)] md:block ${
          ready ? `transition-[width] duration-300 ${EASE} motion-reduce:transition-none` : ""
        } ${open ? "w-[212px]" : "w-[68px]"}`}
      >
        <div
          inert={!open}
          aria-hidden={!open}
          className={`absolute inset-y-0 left-0 w-[212px] ${
            ready ? `transition-[opacity,translate] ${EASE} motion-reduce:transition-none` : ""
          } ${
            open
              ? "translate-x-0 opacity-100 delay-50 duration-300"
              : "pointer-events-none -translate-x-3 opacity-0 duration-150"
          }`}
        >
          {content}
        </div>
        <div
          inert={open}
          aria-hidden={open}
          className={`absolute inset-y-0 left-0 w-[68px] ${
            ready ? `transition-[opacity,translate] ${EASE} motion-reduce:transition-none` : ""
          } ${
            open
              ? "pointer-events-none translate-x-1 opacity-0 duration-100"
              : "translate-x-0 opacity-100 delay-75 duration-200"
          }`}
        >
          {rail}
        </div>
      </aside>

      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={onMobileClose} />
          <aside className="fixed inset-y-0 left-0 z-50 w-[240px] border-r border-[var(--iris-line)] bg-[var(--iris-bg)] md:hidden">
            {content}
          </aside>
        </>
      )}
    </>
  );
}

/**
 * The 1NRI wreath. Ink on light, the brand's cream on dark; small enough to
 * sit in the 68px rail, so the mark shows whether the sidebar is open or not.
 */
function BrandMark() {
  return (
    <span className="flex h-7 shrink-0 items-center" title="1NRI">
      <img src="/brand/wreath-ink.png" alt="1NRI" className="h-7 w-auto dark:hidden" />
      <img src="/brand/wreath-cream.png" alt="1NRI" className="hidden h-7 w-auto dark:block" />
    </span>
  );
}

function RailGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col items-center gap-1 pb-3">{children}</div>;
}

function RailTab({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={`flex items-center justify-center rounded-xl p-2 text-slate-900 transition-colors ${
        active ? "bg-[var(--iris-hover)]" : "hover:bg-[var(--iris-hover)]"
      }`}
    >
      <Icon className="h-5 w-5" strokeWidth={1.5} />
    </Link>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="px-3 py-1 text-sm text-[var(--iris-muted)]">{label}</p>
      {children}
    </div>
  );
}

function SidebarTab({
  item,
  current,
  onNavigate,
}: {
  item: NavItem;
  current: string | null;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  const children = item.children ?? [];
  const childActive = children.some((c) => c.href === current);
  const active = item.href === current;
  const [expanded, setExpanded] = useState(childActive);

  // Opening a sub-page from elsewhere (search, a link) reveals it in the tree.
  useEffect(() => {
    if (childActive) setExpanded(true);
  }, [childActive]);

  return (
    <div>
      <div
        className={`group flex items-center gap-1 rounded-xl p-2 text-sm transition-colors ${
          active ? "bg-[var(--iris-hover)]" : "hover:bg-[var(--iris-hover)]"
        }`}
      >
        {children.length > 0 ? (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="flex h-4 w-4 shrink-0 items-center justify-center text-[var(--iris-faint)] hover:text-slate-900 pointer-coarse:-m-2.5 pointer-coarse:h-9 pointer-coarse:w-9"
            aria-label={expanded ? `Collapse ${item.label}` : `Expand ${item.label}`}
            aria-expanded={expanded}
          >
            <ChevronRight className={`h-4 w-4 transition-transform ${expanded ? "rotate-90" : ""}`} />
          </button>
        ) : (
          <span className="h-4 w-4 shrink-0" />
        )}
        <Link
          href={item.href}
          onClick={onNavigate}
          className="-my-2 flex min-w-0 flex-1 items-center gap-2 self-stretch py-2 text-slate-900"
        >
          <Icon className="h-5 w-5 shrink-0" strokeWidth={1.5} />
          <span className="truncate px-1">{item.label}</span>
        </Link>
      </div>

      {expanded && children.length > 0 && (
        <div className="mt-1 space-y-1">
          {children.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-xl py-2 pl-[38px] pr-2 text-sm transition-colors ${
                c.href === current
                  ? "bg-[var(--iris-hover)] text-slate-900"
                  : "text-slate-900 hover:bg-[var(--iris-hover)]"
              }`}
            >
              <span
                className={`h-1 w-1 shrink-0 rounded-full ${
                  c.href === current ? "bg-slate-900" : "bg-[var(--iris-faint)]"
                }`}
              />
              <span className="truncate">{c.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
