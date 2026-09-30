"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, ArrowLeft, Mail, Pencil, Phone, Plus, User } from "lucide-react";
import { toast } from "sonner";
import { StatsCard } from "@/app/components/StatsCard";
import { formatGHS } from "@/lib/charts/theme";
import { useCan } from "@/lib/rbac/RoleContext";
import { useB2bClient, useUpdateB2bClient } from "@/lib/api/b2b";
import { B2bStatusBadge } from "../../components/B2bStatusBadge";
import { ClientModal } from "../../components/ClientModal";

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—";

export default function B2bClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const canManage = useCan("b2b:manage");
  const { data: client, isLoading, error } = useB2bClient(id);
  const updateClient = useUpdateB2bClient();
  const [editing, setEditing] = useState(false);

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-lg border border-slate-200 bg-white" />;
  }
  if (error || !client) {
    return (
      <section className="space-y-4">
        <Link href="/b2b" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-4 w-4" />
          B2B
        </Link>
        <p className="text-sm text-slate-500">{error?.message ?? "Client not found."}</p>
      </section>
    );
  }

  const archived = !!client.archived_at;

  async function toggleArchive() {
    try {
      await updateClient.mutateAsync({ id, archived: !archived });
      toast.success(archived ? "Client restored." : "Client archived.");
    } catch (err: any) {
      toast.error(err?.message ?? "Could not update the client.", { duration: 6000 });
    }
  }

  return (
    <section className="space-y-6">
      <header className="space-y-3">
        <Link href="/b2b" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-4 w-4" />
          B2B
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">{client.name}</h1>
              {archived && (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                  Archived
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600">
              <span className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-slate-400" />
                {client.contact_name || "No contact person"}
              </span>
              {client.contact_phone && (
                <a href={`tel:${client.contact_phone}`} className="flex items-center gap-1.5 hover:underline">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  {client.contact_phone}
                </a>
              )}
              {client.contact_email && (
                <a href={`mailto:${client.contact_email}`} className="flex items-center gap-1.5 hover:underline">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  {client.contact_email}
                </a>
              )}
            </div>
            {client.notes && <p className="max-w-2xl text-sm text-slate-500">{client.notes}</p>}
          </div>
          {canManage && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={toggleArchive}
                disabled={updateClient.isPending}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                {archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                {archived ? "Restore" : "Archive"}
              </button>
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>
              {!archived && (
                <Link
                  href={`/b2b/orders/new?client=${client.id}`}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  <Plus className="h-4 w-4" />
                  New order
                </Link>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatsCard
          label="Revenue"
          value={formatGHS(client.stats.revenue)}
          helperText={`${client.stats.completedOrders} completed order${client.stats.completedOrders === 1 ? "" : "s"}`}
        />
        <StatsCard label="Units delivered" value={client.stats.units.toLocaleString()} />
        <StatsCard
          label="Pipeline"
          value={formatGHS(client.stats.pipelineValue)}
          helperText={`${client.stats.openOrders} ongoing`}
        />
        <StatsCard label="Client since" value={fmtDate(client.created_at)} />
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Orders</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                {["Order", "Status", "Units", "Value", "Margin", "Delivery"].map((h) => (
                  <th
                    key={h}
                    className={`px-6 py-3 text-xs font-medium uppercase tracking-wide text-slate-400 ${
                      ["Units", "Value", "Margin"].includes(h) ? "text-right" : "text-left"
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {client.orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-400">
                    No orders from this client yet.
                  </td>
                </tr>
              ) : (
                client.orders.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => router.push(`/b2b/orders/${o.id}`)}
                    className="cursor-pointer border-b border-slate-100 transition-colors last:border-b-0 hover:bg-slate-50"
                  >
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-900">{o.order_number}</p>
                      <p className="mt-0.5 max-w-[16rem] truncate text-xs text-slate-400">{o.title}</p>
                    </td>
                    <td className="px-6 py-4">
                      <B2bStatusBadge status={o.status} overdue={o.overdue} />
                    </td>
                    <td className="px-6 py-4 text-right text-sm tabular-nums text-slate-600">
                      {o.units.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium tabular-nums text-slate-900">
                      {formatGHS(o.revenue)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm tabular-nums text-slate-600">
                      {o.margin_pct == null ? "—" : `${o.margin_pct}%`}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                      {o.status === "completed"
                        ? `Done ${fmtDate(o.completed_at)}`
                        : o.status === "cancelled"
                        ? "—"
                        : o.expected_delivery_date
                        ? `Due ${fmtDate(o.expected_delivery_date)}`
                        : "No date"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && <ClientModal client={client} onClose={() => setEditing(false)} />}
    </section>
  );
}
