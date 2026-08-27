"use client";

import { useMemo, useState } from "react";
import { SALES_CHANNELS, useAnalytics } from "@/lib/api/orders";
import { usePopupEvents, usePopupAnalytics } from "@/lib/api/popup-sales";
import { useDateRange, useReport } from "@/lib/api/analytics";
import { ChartCard } from "@/app/components/charts/ChartCard";
import { DualLineChart } from "@/app/components/charts/ComparisonLineChart";
import { DonutChart } from "@/app/components/charts/DonutChart";
import { DeltaBadge } from "@/app/components/DeltaBadge";
import { chart, formatGHSShort } from "@/lib/charts/theme";
import { ChevronDown } from "lucide-react";

type CompareMode =
  | "storefront-vs-popup"
  | "storefront-vs-walkin"
  | "popup-vs-walkin"
  | "popup-vs-popup";

const COMPARE_MODES: { id: CompareMode; label: string }[] = [
  { id: "storefront-vs-popup", label: "Storefront vs Pop-up" },
  { id: "storefront-vs-walkin", label: "Storefront vs Walk-in" },
  { id: "popup-vs-walkin", label: "Pop-up vs Walk-in" },
  { id: "popup-vs-popup", label: "Pop-up vs Pop-up" },
];

/**
 * Pop-up figures come from `/popup-sales/events/:id/analytics`, which covers the
 * whole event — not the period selector — so the two sides of a comparison
 * involving a pop-up cover different windows. Say so rather than imply parity.
 */
const EVENT_WINDOW_NOTE = "Covers the whole event, not the selected period.";

function fmt(n: number) {
  return `GH₵ ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function EventSelector({
  value,
  onChange,
  label,
  events,
  loading,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  label: string;
  events: { id: string; name: string; status: string }[] | undefined;
  loading: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <div className="relative">
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          className="appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none w-full"
          disabled={loading}
        >
          {loading ? (
            <option>Loading events…</option>
          ) : !events?.length ? (
            <option value="">No events yet</option>
          ) : (
            <>
              <option value="">Select an event</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
                  {ev.status === "active" ? " 🟢" : ev.status === "closed" ? " ✓" : " (draft)"}
                </option>
              ))}
            </>
          )}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
    </div>
  );
}

function PeriodSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-slate-500">Time period</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
      >
        <option value="7">Last 7 days</option>
        <option value="30">Last 30 days</option>
        <option value="90">Last 90 days</option>
        <option value="365">Last year</option>
      </select>
    </div>
  );
}

function MetricRow({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="py-3 border-b border-slate-100 last:border-0">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-0.5 text-lg font-bold text-slate-900">{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

/** Channel split for the period: donut + per-channel sales over time. */
function ChannelOverview({ days }: { days: string }) {
  const range = useDateRange(parseInt(days));
  const { data: report } = useReport("sales-by-channel", range);

  const rows = useMemo(
    () =>
      (report?.series ?? []).map((r) => {
        const row: Record<string, string | number> = { date: String(r.date) };
        for (const { key } of SALES_CHANNELS) row[key] = Number(r[key] ?? 0);
        return row;
      }),
    [report],
  );

  const totals = SALES_CHANNELS.map(({ key, label }) => ({
    key,
    label,
    value: report?.table.totals[key] ?? 0,
    previous: report?.table.previousTotals?.[key] ?? 0,
  }));
  const grandTotal = totals.reduce((sum, t) => sum + t.value, 0);

  return (
    <div className="grid gap-5 lg:grid-cols-5">
      <ChartCard title="Sales by channel" className="lg:col-span-2">
        <DonutChart
          data={totals.map((t) => ({ name: t.label, value: t.value }))}
          colors={chart.channels}
          centerValue={formatGHSShort(grandTotal)}
          centerLabel="Total"
          height={160}
        />
        {report?.table.previousTotals && (
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
            {totals.map((t) => (
              <span key={t.key} className="flex items-center gap-1.5">
                {t.label} <DeltaBadge current={t.value} previous={t.previous} />
              </span>
            ))}
          </div>
        )}
      </ChartCard>
      <ChartCard
        title="Channel sales over time"
        className="lg:col-span-3"
        action={
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
            {SALES_CHANNELS.map(({ key, label }, i) => (
              <span key={key} className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-sm"
                  style={{ backgroundColor: chart.channels[i] }}
                />
                {label}
              </span>
            ))}
          </div>
        }
      >
        <DualLineChart
          rows={rows}
          keys={SALES_CHANNELS.map(({ key, label }) => ({ key, label }))}
          colors={chart.channels}
          height={220}
        />
      </ChartCard>
    </div>
  );
}

function StorefrontColumn({ days }: { days: string }) {
  const fromDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - parseInt(days));
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  }, [days]);

  const { data, isLoading, error } = useAnalytics({ from_date: fromDate });
  const aov = data && data.totalOrders > 0 ? data.totalRevenue / data.totalOrders : 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-slate-900" />
        <h3 className="text-sm font-semibold text-slate-700">Storefront</h3>
      </div>
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded bg-slate-100" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-rose-700">Failed to load data.</p>
      ) : (
        <>
          <MetricRow
            label="Revenue"
            value={fmt(data?.totalRevenue ?? 0)}
          />
          <MetricRow
            label="Orders"
            value={String(data?.totalOrders ?? 0)}
          />
          <MetricRow
            label="Avg. Order Value"
            value={fmt(aov)}
          />
        </>
      )}
    </div>
  );
}

function PopupColumn({
  eventId,
  label,
  note,
}: {
  eventId: string | null;
  label: string;
  note?: string;
}) {
  const { data, isLoading, error } = usePopupAnalytics(eventId);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-slate-400" />
        <h3 className="text-sm font-semibold text-slate-700">{label}</h3>
      </div>
      {!eventId ? (
        <p className="text-sm text-slate-400">Select an event to compare.</p>
      ) : isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded bg-slate-100" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-rose-700">Failed to load data.</p>
      ) : data ? (
        <>
          <MetricRow
            label="Revenue"
            value={fmt(data.totalRevenue)}
            sub={`${data.totalTransactions} paid orders`}
          />
          <MetricRow
            label="Transactions"
            value={String(data.totalTransactions)}
          />
          <MetricRow
            label="Avg. Order Value"
            value={fmt(data.aov)}
          />
          {data.revenuePerVisitor !== null && (
            <MetricRow
              label="Revenue per Visitor"
              value={fmt(data.revenuePerVisitor)}
            />
          )}
        </>
      ) : null}
      {note && eventId && <p className="mt-3 text-[11px] text-slate-400">{note}</p>}
    </div>
  );
}

/** Period-scoped walk-in totals — same three metrics as StorefrontColumn. */
function WalkinColumn({ days, note }: { days: string; note?: string }) {
  const range = useDateRange(parseInt(days));
  const { data, isLoading, error } = useReport("walkin-sales-over-time", range);
  const totals = data?.table.totals;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: chart.channels[2] }}
        />
        <h3 className="text-sm font-semibold text-slate-700">Walk-in</h3>
      </div>
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded bg-slate-100" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-rose-700">Failed to load data.</p>
      ) : (
        <>
          <MetricRow label="Revenue" value={fmt(totals?.netSales ?? 0)} />
          <MetricRow label="Orders" value={String(totals?.orders ?? 0)} />
          <MetricRow label="Avg. Order Value" value={fmt(totals?.aov ?? 0)} />
        </>
      )}
      {note && <p className="mt-3 text-[11px] text-slate-400">{note}</p>}
    </div>
  );
}

export function BothView() {
  const [compareMode, setCompareMode] = useState<CompareMode>("storefront-vs-popup");
  const [days, setDays] = useState("30");
  const [popupEventId, setPopupEventId] = useState<string | null>(null);
  const [eventAId, setEventAId] = useState<string | null>(null);
  const [eventBId, setEventBId] = useState<string | null>(null);

  const { data: events, isLoading: eventsLoading } = usePopupEvents();

  return (
    <div className="space-y-6">
      {/* Compare mode toggle */}
      <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 w-fit">
        {COMPARE_MODES.map((mode) => (
          <button
            key={mode.id}
            onClick={() => setCompareMode(mode.id)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-all ${
              compareMode === mode.id
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {compareMode === "storefront-vs-popup" && (
        <>
          <div className="flex flex-wrap items-end gap-4">
            <PeriodSelector value={days} onChange={setDays} />
            <EventSelector
              value={popupEventId}
              onChange={setPopupEventId}
              label="Pop-up event"
              events={events}
              loading={eventsLoading}
            />
          </div>

          <ChannelOverview days={days} />

          <div className="grid gap-4 sm:grid-cols-2">
            <StorefrontColumn days={days} />
            <PopupColumn
              eventId={popupEventId}
              label={
                popupEventId && events
                  ? `Pop-up: ${events.find((e) => e.id === popupEventId)?.name ?? ""}`
                  : "Pop-up"
              }
              note={EVENT_WINDOW_NOTE}
            />
          </div>
        </>
      )}

      {compareMode === "storefront-vs-walkin" && (
        <>
          <div className="flex flex-wrap items-end gap-4">
            <PeriodSelector value={days} onChange={setDays} />
          </div>

          <ChannelOverview days={days} />

          <div className="grid gap-4 sm:grid-cols-2">
            <StorefrontColumn days={days} />
            <WalkinColumn days={days} />
          </div>
        </>
      )}

      {compareMode === "popup-vs-walkin" && (
        <>
          <div className="flex flex-wrap items-end gap-4">
            <PeriodSelector value={days} onChange={setDays} />
            <EventSelector
              value={popupEventId}
              onChange={setPopupEventId}
              label="Pop-up event"
              events={events}
              loading={eventsLoading}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <PopupColumn
              eventId={popupEventId}
              label={
                popupEventId && events
                  ? `Pop-up: ${events.find((e) => e.id === popupEventId)?.name ?? ""}`
                  : "Pop-up"
              }
              note={EVENT_WINDOW_NOTE}
            />
            <WalkinColumn days={days} note="Covers the selected time period." />
          </div>
        </>
      )}

      {compareMode === "popup-vs-popup" && (
        <>
          <div className="flex flex-wrap items-end gap-4">
            <EventSelector
              value={eventAId}
              onChange={setEventAId}
              label="Event A"
              events={events}
              loading={eventsLoading}
            />
            <EventSelector
              value={eventBId}
              onChange={setEventBId}
              label="Event B"
              events={events}
              loading={eventsLoading}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <PopupColumn
              eventId={eventAId}
              label={
                eventAId && events
                  ? events.find((e) => e.id === eventAId)?.name ?? "Event A"
                  : "Event A"
              }
            />
            <PopupColumn
              eventId={eventBId}
              label={
                eventBId && events
                  ? events.find((e) => e.id === eventBId)?.name ?? "Event B"
                  : "Event B"
              }
            />
          </div>
        </>
      )}
    </div>
  );
}
