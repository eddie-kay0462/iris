"use client";

import { useState, useRef, useCallback } from "react";
import {
  usePopupEvents,
  usePopupAnalytics,
  type PopupAnalytics,
} from "@/lib/api/popup-sales";
import {
  ChevronDown,
  TrendingUp,
  Users,
  ShoppingCart,
  DollarSign,
  BarChart2,
  Download,
  Info,
  ChevronRight,
  UserCheck,
  UserPlus,
  Tag,
  CreditCard,
  Clock,
  Percent,
  Star,
  Target,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `GH₵ ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function pct(n: number) {
  return `${n.toFixed(1)}%`;
}

// ─── Mini Bar Chart ───────────────────────────────────────────────────────────

function MiniBarChart({
  data,
  color,
  formatValue,
  height = 160,
}: {
  data: Record<string, number>;
  color: string;
  formatValue: (v: number) => string;
  height?: number;
}) {
  const entries = Object.entries(data).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0)
    return <p className="text-sm text-slate-400">No data yet.</p>;

  const max = Math.max(...entries.map(([, v]) => v), 1);

  return (
    <div className="w-full overflow-x-auto">
      <div
        className="flex items-end gap-1 min-w-0"
        style={{ height }}
      >
        {entries.map(([label, value]) => (
          <div
            key={label}
            className="flex flex-1 flex-col items-center gap-1 min-w-[28px]"
          >
            <span className="text-[10px] text-slate-400 whitespace-nowrap">
              {formatValue(value)}
            </span>
            <div
              className="w-full rounded-t transition-all"
              style={{
                height: `${Math.max(4, (value / max) * (height - 36))}px`,
                background: color,
              }}
            />
            <span className="text-[9px] text-slate-400 whitespace-nowrap">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Horizontal Bar Chart ─────────────────────────────────────────────────────

function HorizontalBarChart({
  items,
  valueKey,
  labelKey,
  color,
  formatValue,
  maxItems = 8,
}: {
  items: Record<string, any>[];
  valueKey: string;
  labelKey: string;
  color: string;
  formatValue: (v: number) => string;
  maxItems?: number;
}) {
  const top = items.slice(0, maxItems);
  const max = Math.max(...top.map((i) => Number(i[valueKey])), 1);

  if (top.length === 0)
    return <p className="text-sm text-slate-400">No data yet.</p>;

  return (
    <div className="space-y-2.5">
      {top.map((item, i) => (
        <div key={i} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-800 truncate max-w-[60%]">
              <span className="text-slate-400 mr-1">{i + 1}.</span>
              {item[labelKey]}
            </span>
            <span className="text-slate-500 shrink-0 ml-2">
              {formatValue(Number(item[valueKey]))}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full transition-all"
              style={{
                width: `${(Number(item[valueKey]) / max) * 100}%`,
                background: color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Metric Card ──────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{label}</p>
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${accent}`}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────

function SectionCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-6 ${className}`}>
      <h2 className="mb-5 text-xs font-semibold uppercase tracking-widest text-slate-400">
        {title}
      </h2>
      {children}
    </div>
  );
}

// ─── Hypothesis Banner ────────────────────────────────────────────────────────

function HypothesisBanner() {
  const [open, setOpen] = useState(false);

  const items = [
    {
      icon: Star,
      color: "text-amber-500",
      bg: "bg-amber-50",
      title: "Community Loyalty",
      desc: "Customers wearing 1NRI receive a 5% discount, testing whether existing customers convert and spend more than new visitors.",
    },
    {
      icon: Target,
      color: "text-blue-500",
      bg: "bg-blue-50",
      title: "Pop-up Retail Effectiveness",
      desc: "Measuring how well a physical activation converts attention into purchases.",
    },
    {
      icon: Percent,
      color: "text-purple-500",
      bg: "bg-purple-50",
      title: "Pricing Sensitivity",
      desc: "Some products discounted, others at full retail — comparing demand at different price points.",
    },
    {
      icon: BarChart2,
      color: "text-emerald-500",
      bg: "bg-emerald-50",
      title: "Product-Market Fit",
      desc: "Tracking which products sell strongly and which do not via IR:IS pop-up analytics.",
    },
  ];

  return (
    <div className="rounded-xl border border-indigo-100 bg-indigo-50">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4"
      >
        <div className="flex items-center gap-3">
          <Info className="h-4 w-4 text-indigo-500 shrink-0" />
          <span className="text-sm font-semibold text-indigo-800">
            What We Are Testing
          </span>
        </div>
        <ChevronRight
          className={`h-4 w-4 text-indigo-400 transition-transform ${
            open ? "rotate-90" : ""
          }`}
        />
      </button>
      {open && (
        <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2">
          {items.map((item) => (
            <div
              key={item.title}
              className={`flex gap-3 rounded-lg p-4 ${item.bg}`}
            >
              <item.icon className={`h-5 w-5 shrink-0 mt-0.5 ${item.color}`} />
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {item.title}
                </p>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Payment Breakdown ────────────────────────────────────────────────────────

function PaymentBreakdown({
  data,
}: {
  data: Record<string, { count: number; revenue: number }>;
}) {
  const entries = Object.entries(data);
  if (entries.length === 0)
    return <p className="text-sm text-slate-400">No payment data yet.</p>;

  const totalRev = entries.reduce((s, [, v]) => s + v.revenue, 0) || 1;
  const colors: Record<string, string> = {
    cash: "bg-emerald-500",
    momo: "bg-violet-500",
    bank_transfer: "bg-blue-500",
    unknown: "bg-slate-400",
  };
  const labels: Record<string, string> = {
    cash: "Cash",
    momo: "MoMo",
    bank_transfer: "Bank Transfer",
    unknown: "Unknown",
  };

  return (
    <div className="space-y-3">
      {entries.map(([method, val]) => (
        <div key={method} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-medium text-slate-800">
              <span
                className={`h-2.5 w-2.5 rounded-full ${colors[method] ?? "bg-slate-400"}`}
              />
              {labels[method] ?? method}
            </span>
            <span className="text-slate-500 text-xs">
              {val.count} orders · {fmt(val.revenue)}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100">
            <div
              className={`h-2 rounded-full ${colors[method] ?? "bg-slate-400"}`}
              style={{ width: `${(val.revenue / totalRev) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Status Breakdown ─────────────────────────────────────────────────────────

function StatusBreakdown({ data }: { data: Record<string, number> }) {
  const styles: Record<string, string> = {
    active: "bg-blue-50 text-blue-700 border-blue-200",
    awaiting_payment: "bg-amber-50 text-amber-700 border-amber-200",
    confirmed: "bg-green-50 text-green-700 border-green-200",
    completed: "bg-slate-100 text-slate-600 border-slate-200",
    on_hold: "bg-orange-50 text-orange-700 border-orange-200",
    cancelled: "bg-red-50 text-red-500 border-red-200",
    refunded: "bg-purple-50 text-purple-700 border-purple-200",
  };
  const labels: Record<string, string> = {
    active: "Active",
    awaiting_payment: "Awaiting Payment",
    confirmed: "Confirmed",
    completed: "Completed",
    on_hold: "On Hold",
    cancelled: "Cancelled",
    refunded: "Refunded",
  };

  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(data).map(([status, count]) => (
        <div
          key={status}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
            styles[status] ?? "bg-slate-50 text-slate-600 border-slate-200"
          }`}
        >
          {labels[status] ?? status}
          <span className="rounded-full bg-white/60 px-1.5 py-0.5 font-bold">
            {count}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Analytics Body ───────────────────────────────────────────────────────────

function AnalyticsBody({ data }: { data: PopupAnalytics }) {
  const {
    totalRevenue,
    totalTransactions,
    totalOrders,
    conversionRate,
    aov,
    revenuePerVisitor,
    visitorCount,
    existingCustomer,
    newCustomer,
    discountImpact,
    paymentBreakdown,
    revenueByHour,
    ordersByHour,
    productPerformance,
    statusBreakdown,
    customerCapture,
  } = data;

  const totalDiscountRevenue =
    discountImpact.discountedRevenue + discountImpact.fullPriceRevenue || 1;

  return (
    <div className="space-y-6 print-body">
      {/* Key metrics */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          label="Total Revenue"
          value={fmt(totalRevenue)}
          sub={`${totalTransactions} paid orders`}
          icon={DollarSign}
          accent="bg-emerald-100 text-emerald-600"
        />
        {/* <MetricCard
          label="Conversion Rate"
          value={pct(conversionRate)}
          sub={`${totalTransactions} of ${totalOrders} orders`}
          icon={TrendingUp}
          accent="bg-blue-100 text-blue-600"
        /> */}
        <MetricCard
          label="Avg. Order Value"
          value={fmt(aov)}
          sub="Per paid transaction"
          icon={ShoppingCart}
          accent="bg-violet-100 text-violet-600"
        />
        <MetricCard
          label="Revenue per Visitor"
          value={revenuePerVisitor !== null ? fmt(revenuePerVisitor) : "N/A"}
          sub={
            visitorCount !== null
              ? `Based on ${visitorCount.toLocaleString()} visitors`
              : "Set visitor count on the event to enable"
          }
          icon={Users}
          accent="bg-amber-100 text-amber-600"
        />
      </div>

      {/* Existing vs New Customer */}
      <div className="grid gap-4 sm:grid-cols-2">
        <SectionCard title="Existing Customer Spend">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-indigo-100">
              <UserCheck className="h-6 w-6 text-indigo-600" />
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-2xl font-bold text-slate-900">
                {fmt(existingCustomer.aov)}
              </p>
              <p className="text-xs text-slate-400">
                AOV across {existingCustomer.orderCount} orders ·{" "}
                {fmt(existingCustomer.revenue)} total
              </p>
              <p className="text-xs text-slate-500">
                Customers who provided contact details
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="New / Walk-in Customers">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-rose-100">
              <UserPlus className="h-6 w-6 text-rose-500" />
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-2xl font-bold text-slate-900">
                {fmt(newCustomer.aov)}
              </p>
              <p className="text-xs text-slate-400">
                AOV across {newCustomer.orderCount} orders ·{" "}
                {fmt(newCustomer.revenue)} total
              </p>
              <p className="text-xs text-slate-500">
                Walk-in purchases with no contact captured
              </p>
            </div>
          </div>
          {existingCustomer.aov > 0 && newCustomer.aov > 0 && (
            <div
              className={`mt-4 rounded-lg px-4 py-3 text-sm ${
                existingCustomer.aov >= newCustomer.aov
                  ? "bg-green-50 text-green-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {existingCustomer.aov >= newCustomer.aov ? (
                <>
                  ✅ Existing customers spend{" "}
                  <strong>
                    {pct(
                      ((existingCustomer.aov - newCustomer.aov) /
                        newCustomer.aov) *
                        100
                    )}
                  </strong>{" "}
                  more than walk-ins — community loyalty validated.
                </>
              ) : (
                <>
                  ⚠️ Walk-ins spend{" "}
                  <strong>
                    {pct(
                      ((newCustomer.aov - existingCustomer.aov) /
                        existingCustomer.aov) *
                        100
                    )}
                  </strong>{" "}
                  more than existing customers.
                </>
              )}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Revenue & Orders Over Time */}
      {(Object.keys(revenueByHour).length > 0 ||
        Object.keys(ordersByHour).length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard title="Revenue Over Time (by Hour)">
            <MiniBarChart
              data={revenueByHour}
              color="#3b82f6"
              formatValue={(v) =>
                `GH₵${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
              }
            />
          </SectionCard>
          <SectionCard title="Orders Over Time (by Hour)">
            <MiniBarChart
              data={ordersByHour}
              color="#8b5cf6"
              formatValue={(v) => String(v)}
            />
          </SectionCard>
        </div>
      )}

      {/* Product Performance */}
      {productPerformance.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard title="Product Performance — Revenue">
            <HorizontalBarChart
              items={productPerformance}
              valueKey="revenue"
              labelKey="name"
              color="#10b981"
              formatValue={(v) => `GH₵${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            />
          </SectionCard>
          <SectionCard title="Product Performance — Units Sold">
            <HorizontalBarChart
              items={productPerformance}
              valueKey="unitsSold"
              labelKey="name"
              color="#f59e0b"
              formatValue={(v) => `${v} units`}
            />
          </SectionCard>
        </div>
      )}

      {/* Discount Impact */}
      <SectionCard title="Pricing Sensitivity & Discount Impact">
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="space-y-1">
            <p className="text-xs text-slate-400">Full-price Orders</p>
            <p className="text-xl font-bold text-slate-900">
              {discountImpact.fullPriceCount}
            </p>
            <p className="text-sm font-semibold text-slate-700">
              {fmt(discountImpact.fullPriceRevenue)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-slate-400">Discounted Orders</p>
            <p className="text-xl font-bold text-slate-900">
              {discountImpact.discountedCount}
            </p>
            <p className="text-sm font-semibold text-slate-700">
              {fmt(discountImpact.discountedRevenue)}
            </p>
            {discountImpact.avgDiscountPct > 0 && (
              <p className="text-xs text-slate-400">
                Avg. discount: {pct(discountImpact.avgDiscountPct)}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs text-slate-400">1NRI Loyalty Discounts</p>
            <p className="text-xl font-bold text-indigo-600">
              {discountImpact.loyaltyOrderCount}
            </p>
            <p className="text-xs text-slate-500">orders with 1NRI / loyalty tag</p>
          </div>
        </div>

        {/* Visual comparison */}
        <div className="mt-5 space-y-2.5">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Full-price revenue</span>
              <span>{fmt(discountImpact.fullPriceRevenue)}</span>
            </div>
            <div className="h-3 w-full rounded-full bg-slate-100">
              <div
                className="h-3 rounded-full bg-slate-700"
                style={{
                  width: `${(discountImpact.fullPriceRevenue / totalDiscountRevenue) * 100}%`,
                }}
              />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Discounted revenue</span>
              <span>{fmt(discountImpact.discountedRevenue)}</span>
            </div>
            <div className="h-3 w-full rounded-full bg-slate-100">
              <div
                className="h-3 rounded-full bg-indigo-500"
                style={{
                  width: `${(discountImpact.discountedRevenue / totalDiscountRevenue) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Payment Breakdown */}
      {Object.keys(paymentBreakdown).length > 0 && (
        <SectionCard title="Payment Method Breakdown">
          <PaymentBreakdown data={paymentBreakdown} />
        </SectionCard>
      )}

      {/* Status Breakdown */}
      {Object.keys(statusBreakdown).length > 0 && (
        <SectionCard title="Order Status Breakdown">
          <StatusBreakdown data={statusBreakdown} />
        </SectionCard>
      )}

      {/* Customer Data Capture */}
      {customerCapture.length > 0 && (
        <SectionCard title={`Customer Data Capture (${customerCapture.length} contacts)`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-2 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                    Name
                  </th>
                  <th className="pb-2 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                    Phone
                  </th>
                  <th className="pb-2 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                    Email
                  </th>
                  <th className="pb-2 text-right text-xs font-medium uppercase tracking-wide text-slate-400">
                    Total Spend
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {customerCapture.map((c, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="py-2.5 font-medium text-slate-800">
                      {c.name || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="py-2.5 text-slate-500">
                      {c.phone || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="py-2.5 text-slate-500">
                      {c.email || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="py-2.5 text-right font-medium text-slate-800">
                      {c.totalSpend > 0
                        ? fmt(c.totalSpend)
                        : <span className="text-slate-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </div>
  );
}

// ─── Print Styles ─────────────────────────────────────────────────────────────

const PRINT_STYLES = `
@media print {
  body { background: white !important; }
  aside, nav, header, .no-print { display: none !important; }
  .print-body { display: block !important; }
  .rounded-xl { border-radius: 8px !important; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  @page { margin: 16mm; size: A4; }
}
`;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PopupAnalyticsPage() {
  const { data: events, isLoading: eventsLoading } = usePopupEvents();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, isLoading, error } = usePopupAnalytics(selectedId);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // Auto-select first event
  if (!selectedId && events && events.length > 0 && !eventsLoading) {
    setSelectedId(events[0].id);
  }

  return (
    <>
      {/* Inject print styles */}
      <style>{PRINT_STYLES}</style>

      <div ref={printRef} className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between no-print">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Pop-up Analytics
            </h1>
            {data?.eventDate && (
              <p className="mt-1 text-sm text-slate-500">
                {data.eventLocation && `${data.eventLocation} · `}
                {new Date(data.eventDate).toLocaleDateString(undefined, {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            )}
            <p className="mt-1 text-sm text-slate-400">
              IR:IS Pop-up Analytics Beta
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Event selector */}
            <div className="relative">
              <select
                value={selectedId ?? ""}
                onChange={(e) => setSelectedId(e.target.value || null)}
                className="appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none"
                disabled={eventsLoading}
              >
                {eventsLoading ? (
                  <option>Loading events…</option>
                ) : events?.length === 0 ? (
                  <option value="">No events yet</option>
                ) : (
                  events?.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name}
                      {ev.status === "active" ? " 🟢" : ev.status === "closed" ? " ✓" : " (draft)"}
                    </option>
                  ))
                )}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>

            {/* Download PDF */}
            {data && (
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 active:scale-[0.98] transition-transform"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </button>
            )}
          </div>
        </div>

        {/* Print header (only visible in print) */}
        <div className="hidden print:block mb-6">
          <h1 className="text-2xl font-bold text-slate-900">
            {data?.eventName ?? "Pop-up Analytics Report"}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            IR:IS Pop-up Analytics · Generated {new Date().toLocaleDateString()}
          </p>
          {data?.eventDate && (
            <p className="text-sm text-slate-500">
              {data.eventLocation && `${data.eventLocation} · `}
              {new Date(data.eventDate).toLocaleDateString(undefined, {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          )}
        </div>

        {/* What We Are Testing */}
        <div className="no-print">
          <HypothesisBanner />
        </div>

        {/* Loading / Error / Empty */}
        {!selectedId ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-12 text-center">
            <BarChart2 className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-medium text-slate-500">
              Select a pop-up event to view analytics
            </p>
          </div>
        ) : isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-40 animate-pulse rounded-xl bg-slate-100"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6">
            <p className="text-sm font-medium text-red-800">
              Failed to load analytics.
            </p>
            <p className="mt-1 text-xs text-red-600">
              {(error as Error).message}
            </p>
          </div>
        ) : data && data.totalOrders === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-12 text-center">
            <ShoppingCart className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-medium text-slate-500">
              No orders recorded for this event yet
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Analytics will appear here once orders are created.
            </p>
          </div>
        ) : data ? (
          <AnalyticsBody data={data} />
        ) : null}
      </div>
    </>
  );
}
