"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  usePromoRedemptions,
  PromoRedemption,
  DiscountSource,
  SalesChannel,
} from "@/lib/api/promos";

const GHS = (n: number) =>
  `GH₵ ${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const CHANNEL_LABELS: Record<SalesChannel, string> = {
  online: "Online store",
  popup: "Pop-up",
  walkin: "Walk-in",
};

const SOURCE_LABELS: Record<DiscountSource, string> = {
  code: "Promo code",
  pairing: "Bundle rule",
  manual: "Manual (staff)",
};

const SOURCE_STYLES: Record<DiscountSource, string> = {
  code: "bg-blue-50 text-blue-700",
  pairing: "bg-indigo-50 text-indigo-700",
  manual: "bg-amber-50 text-amber-700",
};

const STATUS_STYLES: Record<PromoRedemption["status"], string> = {
  confirmed: "bg-green-100 text-green-700",
  pending: "bg-slate-100 text-slate-600",
  reverted: "bg-red-50 text-red-600",
};

function staffName(r: PromoRedemption) {
  const p = r.applied_by_profile;
  if (!p) return "—";
  const name = [p.first_name, p.last_name].filter(Boolean).join(" ");
  return name || p.email || "—";
}

/** The one-line story of why this discount, and not another one, applied. */
function rationale(r: PromoRedemption): string {
  const b = r.breakdown as any;
  if (!b) return "";

  if (r.source === "pairing") {
    const tier = (r.rule_snapshot as any)?.pairing;
    if (tier) {
      const noun = tier.basis === "products" ? "other product" : "other item";
      return `${tier.pairedCount} ${noun}${tier.pairedCount === 1 ? "" : "s"} → tier ${tier.tier?.min_paired_count}+`;
    }
  }
  if (r.source === "manual" && b.overriddenBy) {
    return `Overrode ${b.overriddenBy.label} (${GHS(b.overriddenBy.amount)})`;
  }
  if (r.source === "code" && b.pairingCandidates?.length) {
    return `Beat ${b.pairingCandidates.length} bundle rule${b.pairingCandidates.length === 1 ? "" : "s"}`;
  }
  return "";
}

export default function PromoRedemptionsPage() {
  const [channel, setChannel] = useState("");
  const [source, setSource] = useState("");
  const [status, setStatus] = useState("");

  const { data: rows = [], isLoading } = usePromoRedemptions({
    channel: channel || undefined,
    source: source || undefined,
    status: status || undefined,
  });

  // Reverted rows are history, not money off — leave them out of the totals.
  const live = rows.filter((r) => r.status !== "reverted");
  const totalDiscounted = live.reduce((s, r) => s + Number(r.discount_amount), 0);

  const selectCls =
    "rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400";

  return (
    <section className="space-y-6">
      <Link
        href="/settings/promos"
        className="inline-flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Discounts
      </Link>

      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Discount usage</h1>
        <p className="text-sm text-slate-500">
          Every discount applied on every channel — promo codes, automatic bundle rules, and
          manual staff discounts.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Discounts applied</p>
          <p className="mt-1 text-2xl font-semibold">{live.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total discounted</p>
          <p className="mt-1 text-2xl font-semibold">{GHS(totalDiscounted)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Reverted</p>
          <p className="mt-1 text-2xl font-semibold">
            {rows.filter((r) => r.status === "reverted").length}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <select value={channel} onChange={(e) => setChannel(e.target.value)} className={selectCls}>
          <option value="">All channels</option>
          {(Object.entries(CHANNEL_LABELS) as [SalesChannel, string][]).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <select value={source} onChange={(e) => setSource(e.target.value)} className={selectCls}>
          <option value="">All sources</option>
          {(Object.entries(SOURCE_LABELS) as [DiscountSource, string][]).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls}>
          <option value="">All statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="pending">Pending</option>
          <option value="reverted">Reverted</option>
        </select>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="p-6 text-sm text-slate-500">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">No discounts recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3 text-left">Date</th>
                  <th className="px-5 py-3 text-left">Code / rule</th>
                  <th className="px-5 py-3 text-left">Source</th>
                  <th className="px-5 py-3 text-left">Channel</th>
                  <th className="px-5 py-3 text-left">Order</th>
                  <th className="px-5 py-3 text-left">Staff</th>
                  <th className="px-5 py-3 text-right">Subtotal</th>
                  <th className="px-5 py-3 text-right">Discount</th>
                  <th className="px-5 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => {
                  const why = rationale(r);
                  return (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-5 py-3 text-slate-600">
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3">
                        <div className="font-medium">
                          {r.code_snapshot ? (
                            <span className="font-mono">{r.code_snapshot}</span>
                          ) : (
                            ((r.rule_snapshot as any)?.label ?? "—")
                          )}
                        </div>
                        {why && <div className="mt-0.5 text-xs text-slate-400">{why}</div>}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${SOURCE_STYLES[r.source]}`}>
                          {SOURCE_LABELS[r.source]}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-600">{CHANNEL_LABELS[r.channel]}</td>
                      <td className="px-5 py-3 font-mono text-xs text-slate-600">
                        {r.order_number ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-slate-600">{staffName(r)}</td>
                      <td className="px-5 py-3 text-right text-slate-600">{GHS(r.subtotal)}</td>
                      <td className="px-5 py-3 text-right font-medium text-green-600">
                        −{GHS(r.discount_amount)}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLES[r.status]}`}>
                          {r.status}
                        </span>
                        {r.revert_reason && (
                          <div className="mt-0.5 text-xs text-slate-400">{r.revert_reason}</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
