"use client";

import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";
import { ShieldCheck, Store, X } from "lucide-react";
import { Avatar } from "../Avatar";
import type { useNotifications } from "./useNotifications";

type PanelData = ReturnType<typeof useNotifications>;

function ago(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const mins = (Date.now() - d.getTime()) / 60_000;
  if (mins < 1) return "Just now";
  if (mins < 60 * 24) return `${formatDistanceToNowStrict(d)} ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/**
 * The kit's right-hand notification bar: Notifications, Team Activity and
 * New Customers, all from live IRIS data. Inline at xl+, a drawer below that.
 */
export function RightPanel({
  data,
  open,
  drawerOpen,
  onCloseDrawer,
}: {
  data: PanelData;
  open: boolean;
  drawerOpen: boolean;
  onCloseDrawer: () => void;
}) {
  const body = <PanelBody data={data} onNavigate={onCloseDrawer} onClose={onCloseDrawer} />;

  return (
    <>
      <aside
        className={`hidden shrink-0 overflow-hidden border-l border-[var(--iris-line)] bg-[var(--iris-bg)] transition-[width] duration-300 xl:block ${
          open ? "w-[280px]" : "w-0 border-l-0"
        }`}
        aria-label="Notifications"
      >
        <div className="h-full w-[280px] overflow-y-auto">{body}</div>
      </aside>

      {drawerOpen && (
        <div className="xl:hidden">
          <div className="fixed inset-0 z-40 bg-black/30" onClick={onCloseDrawer} />
          <aside
            className="fixed inset-y-0 right-0 z-50 w-[300px] max-w-[85vw] overflow-y-auto border-l border-[var(--iris-line)] bg-[var(--iris-bg)]"
            aria-label="Notifications"
          >
            {body}
          </aside>
        </div>
      )}
    </>
  );
}

function PanelBody({
  data,
  onNavigate,
  onClose,
}: {
  data: PanelData;
  onNavigate: () => void;
  onClose: () => void;
}) {
  const { notifications, team, newCustomers, show, loading } = data;

  return (
    <div className="flex flex-col gap-4 p-4">
      {show.notifications && (
        <Section
          title="Notifications"
          action={
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--iris-muted)] hover:bg-[var(--iris-hover)] xl:hidden"
              aria-label="Close notifications"
            >
              <X className="h-4 w-4" />
            </button>
          }
        >
          {notifications.length === 0 ? (
            <Empty loading={loading}>You&apos;re all caught up.</Empty>
          ) : (
            notifications.map((n) => {
              const Icon = n.icon;
              return (
                <Row key={n.id} href={n.href} onNavigate={onNavigate}>
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[var(--iris-info-bg)] text-slate-900">
                    <Icon className="h-4 w-4" strokeWidth={1.5} />
                  </span>
                  <Text
                    title={n.title}
                    sub={[n.time ? ago(n.time) : null, n.meta].filter(Boolean).join(" · ")}
                  />
                </Row>
              );
            })
          )}
        </Section>
      )}

      {show.team && (
        <Section title="Team Activity">
          {team.length === 0 ? (
            <Empty loading={loading}>No recent activity.</Empty>
          ) : (
            <div className="relative">
              {team.map((a, i) => {
                const Icon = a.kind === "sale" ? Store : ShieldCheck;
                return (
                  <div key={a.id} className="relative">
                    {i < team.length - 1 && (
                      <span className="absolute left-[19px] top-9 h-[calc(100%-28px)] w-px bg-[var(--iris-line)]" />
                    )}
                    <Row href={a.href} onNavigate={onNavigate}>
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--iris-hover)] text-slate-900">
                        <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </span>
                      <Text title={a.title} sub={ago(a.time)} />
                    </Row>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      )}

      {show.customers && (
        <Section title="New Customers">
          {newCustomers.length === 0 ? (
            <Empty loading={loading}>No customers yet.</Empty>
          ) : (
            newCustomers.map((c) => (
              <Row key={c.id} href={`/customers/${c.id}`} onNavigate={onNavigate} center>
                <Avatar name={c.name} size={24} />
                <Text title={c.name} sub={ago(c.time)} />
              </Row>
            ))
          )}
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-1">
      <div className="flex items-center justify-between px-1 py-2">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Row({
  href,
  onNavigate,
  center,
  children,
}: {
  href: string;
  onNavigate: () => void;
  center?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`relative flex gap-2 rounded-lg p-2 transition-colors hover:bg-[var(--iris-hover)] ${
        center ? "items-center" : "items-start"
      }`}
    >
      {children}
    </Link>
  );
}

function Text({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm leading-5 text-slate-900">{title}</p>
      {sub && <p className="truncate text-xs leading-[18px] text-[var(--iris-muted)]">{sub}</p>}
    </div>
  );
}

function Empty({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  if (loading) {
    return (
      <div className="space-y-2 p-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex animate-pulse gap-2">
            <div className="h-6 w-6 rounded-lg bg-[var(--iris-hover)]" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-3/4 rounded bg-[var(--iris-hover)]" />
              <div className="h-2.5 w-1/3 rounded bg-[var(--iris-hover)]" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  return <p className="px-2 py-1 text-xs text-[var(--iris-muted)]">{children}</p>;
}
