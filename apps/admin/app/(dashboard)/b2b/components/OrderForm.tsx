"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Plus, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { computeB2bFinancials, type B2bCostKind } from "@/lib/b2b-math";
import { formatGHS } from "@/lib/charts/theme";
import {
  useB2bClients,
  useCreateB2bOrder,
  useUpdateB2bOrder,
  type B2bClient,
  type B2bOrder,
} from "@/lib/api/b2b";
import { ClientModal } from "./ClientModal";

type LineDraft = { key: number; label: string; kind: B2bCostKind; amount: string };

type Props = {
  /** Omit to create a new order. */
  order?: B2bOrder;
  /** Preselect a client when creating from a client's page. */
  initialClientId?: string;
  readOnly?: boolean;
  onSaved?: (order: B2bOrder) => void;
};

const inputClass =
  "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500";

const cardClass = "rounded-lg border border-slate-200 bg-white p-5 space-y-4";

/** Parse a money input. The API takes at most 2 decimal places. */
const toMoney = (s: string): number => {
  const n = parseFloat(s);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
};

const toUnits = (s: string): number => {
  const n = Number(s);
  return Number.isInteger(n) ? n : NaN;
};

let nextKey = 1;
const blankLine = (kind: B2bCostKind = "per_unit"): LineDraft => ({
  key: nextKey++,
  label: "",
  kind,
  amount: "",
});

function daysBetween(start: string, end: string): number | null {
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Number.isFinite(ms) ? Math.round(ms / 86_400_000) : null;
}

export function OrderForm({ order, initialClientId, readOnly = false, onSaved }: Props) {
  const { data: clients = [] } = useB2bClients();
  const create = useCreateB2bOrder();
  const update = useUpdateB2bOrder();
  const saving = create.isPending || update.isPending;

  const [clientId, setClientId] = useState(order?.client_id ?? initialClientId ?? "");
  const [title, setTitle] = useState(order?.title ?? "");
  const [notes, setNotes] = useState(order?.notes ?? "");
  const [startDate, setStartDate] = useState(order?.expected_start_date ?? "");
  const [deliveryDate, setDeliveryDate] = useState(order?.expected_delivery_date ?? "");
  const [units, setUnits] = useState(order ? String(order.units) : "");
  const [unitPrice, setUnitPrice] = useState(order ? String(order.unit_price) : "");
  const [lines, setLines] = useState<LineDraft[]>(() =>
    order && order.cost_lines.length > 0
      ? order.cost_lines.map((l) => ({
          key: nextKey++,
          label: l.label,
          kind: l.kind,
          amount: String(l.amount),
        }))
      : [blankLine()],
  );
  const [showClientModal, setShowClientModal] = useState(false);

  // An archived client drops out of the picker, but an order that already
  // belongs to one must still show it.
  const clientOptions = useMemo<Omit<B2bClient, "stats">[]>(() => {
    if (order?.client && !clients.some((c) => c.id === order.client.id)) {
      return [...clients, order.client];
    }
    return clients;
  }, [clients, order]);
  const selectedClient = clientOptions.find((c) => c.id === clientId);

  const financials = useMemo(
    () =>
      computeB2bFinancials({
        units: toUnits(units),
        unitPrice: toMoney(unitPrice),
        costLines: lines.map((l) => ({ kind: l.kind, amount: toMoney(l.amount) })),
      }),
    [units, unitPrice, lines],
  );

  const unitCount = toUnits(units);
  const perOrderLines = lines.filter((l) => l.kind === "per_order" && l.amount);
  const loss = financials.grossProfit < 0;
  const duration = daysBetween(startDate, deliveryDate);

  function updateLine(key: number, patch: Partial<LineDraft>) {
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function removeLine(key: number) {
    setLines((ls) => (ls.length > 1 ? ls.filter((l) => l.key !== key) : [blankLine()]));
  }

  /** Returns an error message, or null when the order can be saved. */
  function validate(filledLines: LineDraft[]): string | null {
    if (!clientId) return "Choose a client.";
    if (!title.trim()) return "Give the order a title.";
    if (!Number.isInteger(unitCount) || unitCount < 1) return "Units must be a whole number of at least 1.";
    const price = toMoney(unitPrice);
    if (!Number.isFinite(price) || price < 0) return "Enter a selling price per unit.";
    for (const l of filledLines) {
      if (!l.label.trim()) return "Every cost needs a name.";
      const amt = toMoney(l.amount);
      if (!Number.isFinite(amt) || amt < 0) return `Enter a cost for "${l.label.trim()}".`;
    }
    if (startDate && deliveryDate && deliveryDate < startDate) {
      return "Expected delivery cannot be before the expected start.";
    }
    return null;
  }

  async function save(status?: "draft" | "confirmed") {
    // A row left completely empty is just the spare line, not a cost.
    const filledLines = lines.filter((l) => l.label.trim() || l.amount.trim());
    const error = validate(filledLines);
    if (error) {
      toast.error(error, { duration: 6000 });
      return;
    }
    const costLines = filledLines.map((l) => ({
      label: l.label.trim(),
      kind: l.kind,
      amount: toMoney(l.amount),
    }));

    try {
      const saved = order
        ? await update.mutateAsync({
            id: order.id,
            client_id: clientId,
            title: title.trim(),
            notes: notes.trim(),
            units: unitCount,
            unit_price: toMoney(unitPrice),
            cost_lines: costLines,
            expected_start_date: startDate || null,
            expected_delivery_date: deliveryDate || null,
          })
        : await create.mutateAsync({
            client_id: clientId,
            title: title.trim(),
            ...(notes.trim() ? { notes: notes.trim() } : {}),
            units: unitCount,
            unit_price: toMoney(unitPrice),
            cost_lines: costLines,
            ...(startDate ? { expected_start_date: startDate } : {}),
            ...(deliveryDate ? { expected_delivery_date: deliveryDate } : {}),
            status,
          });
      toast.success(order ? "Order saved." : `${saved.order_number} created.`);
      onSaved?.(saved);
    } catch (err: any) {
      toast.error(err?.message ?? "Could not save the order.", { duration: 6000 });
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {/* ── Client ─────────────────────────────────────────────────────── */}
        <div className={cardClass}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Client</h2>
          <div className="flex gap-2">
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              disabled={readOnly}
              className={inputClass}
            >
              <option value="">Choose a client…</option>
              {clientOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.archived_at ? " (archived)" : ""}
                </option>
              ))}
            </select>
            {!readOnly && (
              <button
                type="button"
                onClick={() => setShowClientModal(true)}
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                <UserPlus className="h-4 w-4" />
                New client
              </button>
            )}
          </div>
          {selectedClient && (
            <dl className="grid gap-3 rounded-lg bg-slate-50 px-4 py-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-slate-400">Contact person</dt>
                <dd className="text-slate-700">{selectedClient.contact_name || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Phone</dt>
                <dd className="text-slate-700">{selectedClient.contact_phone || "—"}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs text-slate-400">Email</dt>
                <dd className="truncate text-slate-700">{selectedClient.contact_email || "—"}</dd>
              </div>
            </dl>
          )}
        </div>

        {/* ── Order details & timeline ───────────────────────────────────── */}
        <div className={cardClass}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Order</h2>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={readOnly}
              placeholder="e.g. 200 branded hoodies for staff"
              className={inputClass}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Expected start</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={readOnly}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Expected delivery</label>
              <input
                type="date"
                value={deliveryDate}
                min={startDate || undefined}
                onChange={(e) => setDeliveryDate(e.target.value)}
                disabled={readOnly}
                className={inputClass}
              />
            </div>
          </div>
          {duration != null && duration >= 0 && (
            <p className="text-xs text-slate-500">
              {duration === 0 ? "Same-day turnaround." : `${duration} day${duration === 1 ? "" : "s"} from start to delivery.`}
            </p>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={readOnly}
              className={inputClass}
            />
          </div>
        </div>

        {/* ── Cost builder ───────────────────────────────────────────────── */}
        <div className={cardClass}>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Costs</h2>
            <p className="mt-1 text-xs text-slate-500">
              Add what goes into each unit. Mark one-off costs like setup or delivery as{" "}
              <span className="font-medium">per order</span> and they are spread across the units.
            </p>
          </div>

          <div className="space-y-2">
            {lines.map((line) => (
              <div key={line.key} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                <input
                  value={line.label}
                  onChange={(e) => updateLine(line.key, { label: e.target.value })}
                  disabled={readOnly}
                  placeholder="Cost name, e.g. Fabric"
                  className={`${inputClass} min-w-0 flex-1 basis-full sm:basis-auto`}
                />
                <div className="flex shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                  {(["per_unit", "per_order"] as const).map((kind) => (
                    <button
                      key={kind}
                      type="button"
                      disabled={readOnly}
                      onClick={() => updateLine(line.key, { kind })}
                      className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                        line.kind === kind ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {kind === "per_unit" ? "Per unit" : "Per order"}
                    </button>
                  ))}
                </div>
                <div className="relative w-32 shrink-0">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                    GH₵
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={line.amount}
                    onChange={(e) => updateLine(line.key, { amount: e.target.value })}
                    disabled={readOnly}
                    placeholder="0.00"
                    className={`${inputClass} pl-10 text-right tabular-nums`}
                  />
                </div>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => removeLine(line.key)}
                    title="Remove cost"
                    className="shrink-0 rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {!readOnly && (
            <button
              type="button"
              onClick={() => setLines((ls) => [...ls, blankLine()])}
              className="flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:border-slate-400 hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              Add cost
            </button>
          )}

          <div className="space-y-1.5 border-t border-slate-100 pt-4 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Per-unit costs</span>
              <span className="tabular-nums">{formatGHS(financials.perUnitCost)}</span>
            </div>
            {perOrderLines.length > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>
                  One-off costs {formatGHS(financials.perOrderCost)}
                  {unitCount > 0 ? ` ÷ ${unitCount.toLocaleString()} units` : ""}
                </span>
                <span className="tabular-nums">
                  {unitCount > 0 ? `+ ${formatGHS(financials.perOrderCost / unitCount)}` : "—"}
                </span>
              </div>
            )}
            <div className="flex justify-between pt-1 text-base font-semibold text-slate-900">
              <span>Total unit cost</span>
              <span className="tabular-nums">{formatGHS(financials.unitCost)}</span>
            </div>
          </div>
        </div>

        {/* ── Pricing ────────────────────────────────────────────────────── */}
        <div className={cardClass}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Pricing</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Selling price per unit *</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                  GH₵
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  disabled={readOnly}
                  placeholder="0.00"
                  className={`${inputClass} pl-10 tabular-nums`}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Number of units *</label>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                value={units}
                onChange={(e) => setUnits(e.target.value)}
                disabled={readOnly}
                placeholder="0"
                className={`${inputClass} tabular-nums`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Live results ─────────────────────────────────────────────────── */}
      <aside className="lg:col-span-1">
        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 lg:sticky lg:top-0">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Order economics</h2>

          <div>
            <p className="text-xs text-slate-400">Revenue</p>
            <p className="text-2xl font-semibold tabular-nums text-slate-900">{formatGHS(financials.revenue)}</p>
          </div>

          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Total cost</dt>
              <dd className="tabular-nums text-slate-700">{formatGHS(financials.totalCost)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Gross profit</dt>
              <dd className={`tabular-nums font-medium ${loss ? "text-rose-700" : "text-slate-900"}`}>
                {formatGHS(financials.grossProfit)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Gross margin</dt>
              <dd className={`tabular-nums font-medium ${loss ? "text-rose-700" : "text-slate-900"}`}>
                {financials.marginPct == null ? "—" : `${financials.marginPct}%`}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Markup</dt>
              <dd className="tabular-nums text-slate-700">
                {financials.markupPct == null ? "—" : `${financials.markupPct}%`}
              </dd>
            </div>
          </dl>

          <div className="space-y-2 border-t border-slate-100 pt-4 text-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Per unit</p>
            <div className="flex justify-between">
              <span className="text-slate-500">Price</span>
              <span className="tabular-nums text-slate-700">{formatGHS(Number.isFinite(toMoney(unitPrice)) ? toMoney(unitPrice) : 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Cost</span>
              <span className="tabular-nums text-slate-700">{formatGHS(financials.unitCost)}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span className="text-slate-500">Profit</span>
              <span className={`tabular-nums ${loss ? "text-rose-700" : "text-slate-900"}`}>
                {formatGHS(unitCount > 0 ? financials.grossProfit / unitCount : 0)}
              </span>
            </div>
          </div>

          {loss && (
            <div className="flex gap-2 rounded-lg bg-rose-50 px-3 py-2.5 text-xs text-rose-800">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              The selling price is below the cost to make each unit. This order loses money.
            </div>
          )}

          {!readOnly && (
            <div className="space-y-2 border-t border-slate-100 pt-4">
              {order ? (
                <button
                  type="button"
                  onClick={() => save()}
                  disabled={saving}
                  className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => save("confirmed")}
                    disabled={saving}
                    className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Create confirmed order"}
                  </button>
                  <button
                    type="button"
                    onClick={() => save("draft")}
                    disabled={saving}
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Save as draft
                  </button>
                  <p className="text-xs text-slate-400">
                    Revenue and units count toward your figures once the order is marked complete.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </aside>

      {showClientModal && (
        <ClientModal
          onClose={() => setShowClientModal(false)}
          onSaved={(c) => setClientId(c.id)}
        />
      )}
    </div>
  );
}
