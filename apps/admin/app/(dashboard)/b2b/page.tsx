"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Boxes,
  CalendarClock,
  CircleDollarSign,
  Clock,
  Download,
  Percent,
  Plus,
  Receipt,
  UserPlus,
  Users,
  Workflow,
} from "lucide-react";
import { StatsCard } from "@/app/components/StatsCard";
import { DeltaBadge } from "@/app/components/DeltaBadge";
import { SearchInput } from "@/app/components/SearchInput";
import { Pagination } from "@/app/components/Pagination";
import { formatGHS } from "@/lib/charts/theme";
import { toast } from "sonner";
import { getToken } from "@/lib/api/client";
import { useCan } from "@/lib/rbac/RoleContext";
import {
  useB2bClients,
  useB2bOrders,
  useB2bSummary,
  type B2bOrderListItem,
  type B2bStatus,
} from "@/lib/api/b2b";
import { B2bStatusBadge } from "./components/B2bStatusBadge";
import { ClientModal } from "./components/ClientModal";

type RangeKey = "30" | "90" | "365" | "all";

const RANGES: { value: RangeKey; label: string }[] = [
  { value: "30", label: "30d" },
  { value: "90", label: "90d" },
  { value: "365", label: "12m" },
  { value: "all", label: "All time" },
];

type OrderFilter = "open" | "completed" | "cancelled" | "all";

const ORDER_FILTERS: { value: OrderFilter; label: string }[] = [
  { value: "open", label: "Ongoing" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "all", label: "All" },
];

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—";

/** The date that matters for an order: when it was delivered, or when it is due. */
function dueCell(o: B2bOrderListItem) {
  if (o.status === "completed") return <span className="text-slate-600">Done {fmtDate(o.completed_at)}</span>;
  if (o.status === "cancelled") return <span className="text-slate-400">—</span>;
  return (
    <span className={o.overdue ? "font-medium text-rose-700" : "text-slate-600"}>
      {o.expected_delivery_date ? `Due ${fmtDate(o.expected_delivery_date)}` : "No date"}
    </span>
  );
}

export default function B2bPage() {
  const router = useRouter();
  const canManage = useCan("b2b:manage");

  const [range, setRange] = useState<RangeKey>("90");
  const summaryRange = useMemo(() => {
    if (range === "all") return {};
    const from = new Date();
    from.setDate(from.getDate() - parseInt(range, 10));
    from.setHours(0, 0, 0, 0);
    return { from: from.toISOString() };
  }, [range]);

  const [orderFilter, setOrderFilter] = useState<OrderFilter>("open");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showClientModal, setShowClientModal] = useState(false);
  const [exporting, setExporting] = useState(false);

  /** Download the orders under the current filter (search is not applied). */
  async function exportCsv() {
    setExporting(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
      const qs = orderFilter === "all" ? "" : `?status=${orderFilter}`;
      const res = await fetch(`${base}/export/b2b-orders${qs}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Export failed");
      const link = document.createElement("a");
      link.href = URL.createObjectURL(await res.blob());
      link.download = `b2b-orders-${orderFilter}-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
    } catch {
      toast.error("Could not export B2B orders. Please try again.", { duration: 6000 });
    } finally {
      setExporting(false);
    }
  }

  const { data: summary, isLoading: summaryLoading } = useB2bSummary(summaryRange);
  const { data: orders, isLoading: ordersLoading } = useB2bOrders({
    status: orderFilter === "all" ? undefined : (orderFilter as B2bStatus | "open"),
    search: search || undefined,
    page,
    limit: 15,
  });
  const { data: clients = [], isLoading: clientsLoading } = useB2bClients();

  const dash = summaryLoading ? "…" : "—";
  const prev = summary?.previous ?? null;

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">B2B</h1>
          <p className="text-sm text-slate-500">Bulk orders for business clients, from quote to delivery.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-all ${
                  range === r.value ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          {canManage && (
            <>
              <button
                onClick={() => setShowClientModal(true)}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <UserPlus className="h-4 w-4" />
                New client
              </button>
              <Link
                href="/b2b/orders/new"
                className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" />
                New B2B order
              </Link>
            </>
          )}
        </div>
      </header>

      {/* ── KPIs ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 iris-stat-grid">
        <StatsCard
          label="B2B revenue"
          icon={CircleDollarSign}
          value={summary ? formatGHS(summary.revenue) : dash}
          helperText={
            summary && (
              <span className="flex items-center gap-1.5">
                {summary.orders} completed order{summary.orders === 1 ? "" : "s"}
                <DeltaBadge current={summary.revenue} previous={prev?.revenue} />
              </span>
            )
          }
        />
        <StatsCard
          label="Units delivered"
          icon={Boxes}
          value={summary ? summary.units.toLocaleString() : dash}
          helperText={
            summary && (
              <span className="flex items-center gap-1.5">
                Toward Road to HQ
                <DeltaBadge current={summary.units} previous={prev?.units} />
              </span>
            )
          }
        />
        <StatsCard
          label="Gross margin"
          icon={Percent}
          value={summary ? (summary.marginPct == null ? "—" : `${summary.marginPct}%`) : dash}
          helperText={summary && `${formatGHS(summary.grossProfit)} gross profit`}
        />
        <StatsCard
          label="Avg order value"
          icon={Receipt}
          value={summary ? formatGHS(summary.averageOrderValue) : dash}
          helperText={
            summary && <DeltaBadge current={summary.averageOrderValue} previous={prev?.averageOrderValue} />
          }
        />
        <StatsCard
          label="Pipeline"
          icon={Workflow}
          value={summary ? formatGHS(summary.pipeline.revenue) : dash}
          helperText={
            summary &&
            `${summary.pipeline.orders} ongoing · ${summary.pipeline.units.toLocaleString()} units`
          }
        />
        <StatsCard
          label="Clients"
          icon={Users}
          value={summary ? summary.clients.total : dash}
          helperText={summary && `${summary.clients.active} active in this period`}
        />
        <StatsCard
          label="On-time delivery"
          icon={Clock}
          value={summary ? (summary.onTime.rate == null ? "—" : `${summary.onTime.rate}%`) : dash}
          helperText={
            summary &&
            (summary.onTime.measured > 0
              ? `${summary.onTime.onTime} of ${summary.onTime.measured} with a due date`
              : "No completed orders with a due date")
          }
        />
        <StatsCard
          label="Overdue"
          icon={CalendarClock}
          value={summary ? summary.overdue : dash}
          color={summary && summary.overdue > 0 ? "text-rose-700" : "text-slate-900"}
          helperText="Ongoing orders past their due date"
        />
      </div>

      {/* ── Orders ────────────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-1">
            {ORDER_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => {
                  setOrderFilter(f.value);
                  setPage(1);
                }}
                className={`shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                  orderFilter === f.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <div className="min-w-0 flex-1 sm:w-64">
              <SearchInput
                value={search}
                onChange={(v) => {
                  setSearch(v);
                  setPage(1);
                }}
                placeholder="Search order no. or title"
              />
            </div>
            <button
              onClick={exportCsv}
              disabled={exporting}
              title="Download the orders in this filter as a spreadsheet"
              className="flex shrink-0 items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {exporting ? "Exporting…" : "Export CSV"}
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                {["Order", "Client", "Status", "Units", "Value", "Margin", "Delivery"].map((h) => (
                  <th
                    key={h}
                    className={`whitespace-nowrap px-6 py-3 text-xs font-medium uppercase tracking-wide text-slate-400 ${
                      ["Units", "Value", "Margin"].includes(h) ? "text-right" : "text-left"
                    } ${["Margin", "Delivery"].includes(h) ? "hidden lg:table-cell" : ""}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ordersLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-sm text-slate-400">Loading…</td>
                </tr>
              ) : !orders || orders.data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-sm text-slate-400">
                    {search
                      ? "No orders match that search."
                      : orderFilter === "open"
                      ? "No ongoing B2B orders."
                      : "No B2B orders here yet."}
                  </td>
                </tr>
              ) : (
                orders.data.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => router.push(`/b2b/orders/${o.id}`)}
                    className="cursor-pointer border-b border-slate-100 transition-colors last:border-b-0 hover:bg-slate-50"
                  >
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-900">{o.order_number}</p>
                      <p className="mt-0.5 max-w-[16rem] truncate text-xs text-slate-400">{o.title}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">{o.client?.name ?? "—"}</td>
                    <td className="px-6 py-4">
                      <B2bStatusBadge status={o.status} overdue={o.overdue} />
                    </td>
                    <td className="px-6 py-4 text-right text-sm tabular-nums text-slate-600">
                      {o.units.toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium tabular-nums text-slate-900">
                      {formatGHS(o.revenue)}
                    </td>
                    <td
                      className={`hidden px-6 py-4 text-right text-sm tabular-nums lg:table-cell ${
                        o.margin_pct != null && o.margin_pct < 0 ? "text-rose-700" : "text-slate-600"
                      }`}
                    >
                      {o.margin_pct == null ? "—" : `${o.margin_pct}%`}
                    </td>
                    <td className="hidden whitespace-nowrap px-6 py-4 text-sm lg:table-cell">{dueCell(o)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {orders && <Pagination page={orders.page} totalPages={orders.totalPages} onPageChange={setPage} />}
      </div>

      {/* ── Clients ───────────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Clients</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                {["Client", "Contact", "Orders", "Ongoing", "Revenue", "Units", "Last order"].map((h) => (
                  <th
                    key={h}
                    className={`px-6 py-3 text-xs font-medium uppercase tracking-wide text-slate-400 ${
                      ["Orders", "Ongoing", "Revenue", "Units"].includes(h) ? "text-right" : "text-left"
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clientsLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-sm text-slate-400">Loading…</td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-sm text-slate-400">
                    No B2B clients yet{canManage ? " — add your first one." : "."}
                  </td>
                </tr>
              ) : (
                clients.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/b2b/clients/${c.id}`)}
                    className="cursor-pointer border-b border-slate-100 transition-colors last:border-b-0 hover:bg-slate-50"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{c.name}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-700">{c.contact_name || "—"}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{c.contact_phone || c.contact_email || ""}</p>
                    </td>
                    <td className="px-6 py-4 text-right text-sm tabular-nums text-slate-600">{c.stats.orders}</td>
                    <td className="px-6 py-4 text-right text-sm tabular-nums text-slate-600">{c.stats.openOrders}</td>
                    <td className="px-6 py-4 text-right text-sm font-medium tabular-nums text-slate-900">
                      {formatGHS(c.stats.revenue)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm tabular-nums text-slate-600">
                      {c.stats.units.toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                      {fmtDate(c.stats.lastOrderAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showClientModal && (
        <ClientModal
          onClose={() => setShowClientModal(false)}
          onSaved={(c) => router.push(`/b2b/clients/${c.id}`)}
        />
      )}
    </section>
  );
}
