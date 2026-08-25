"use client";

import { useEffect, useRef, useState } from "react";
import { Tag, X, Sparkles, AlertTriangle } from "lucide-react";
import type { DiscountResolution, SalesChannel, ValueType } from "@/lib/api/promos";
import {
  useChannelDiscount,
  type ChannelDiscountItem,
} from "@/lib/hooks/useChannelDiscount";

export interface DiscountPanelState {
  resolution: DiscountResolution | null;
  promoCode: string;
  manualType: "none" | ValueType;
  manualValue: string;
  manualReason: string;
}

interface Props {
  channel: SalesChannel;
  items: ChannelDiscountItem[];
  onChange: (state: DiscountPanelState) => void;
}

const GHS = (n: number) => `GH₵${Number(n).toFixed(2)}`;

/**
 * The walk-in POS discount panel.
 *
 * Every figure it shows comes back from the server's discount engine — the same
 * one the storefront uses — so a code is worth the same at the counter as it is
 * online. Staff can still apply a free-form override; when that override is
 * worth less than a rule the basket qualifies for, it says so.
 */
export default function DiscountPanel({ channel, items, onChange }: Props) {
  const [promoCode, setPromoCode] = useState("");
  const [appliedCode, setAppliedCode] = useState("");
  const [manualType, setManualType] = useState<"none" | ValueType>("none");
  const [manualValue, setManualValue] = useState("");
  const [manualReason, setManualReason] = useState("");

  const {
    resolution,
    autoCandidates,
    overriddenBy,
    codeError,
    clearCodeError,
  } = useChannelDiscount({
    channel,
    items,
    appliedCode,
    manualType,
    manualValue,
    manualReason,
  });

  // Ref so the effect below does not re-fire on every parent render.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    onChangeRef.current({
      resolution,
      promoCode: appliedCode,
      manualType,
      manualValue,
      manualReason,
    });
  }, [resolution, appliedCode, manualType, manualValue, manualReason]);

  const winner = resolution?.source;

  const inputCls =
    "rounded-md border border-slate-300 px-2 py-2 text-sm outline-none focus:border-slate-900";

  return (
    <section className="mb-4">
      <h3 className="mb-2 text-sm font-semibold text-slate-700">Discount</h3>

      {/* Promo code */}
      <div className="mb-2 flex gap-2">
        <div className="relative flex-1">
          <Tag className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === "Enter" && promoCode.trim()) setAppliedCode(promoCode.trim());
            }}
            placeholder="Promo code"
            disabled={!!appliedCode}
            className={`${inputCls} w-full pl-8 disabled:bg-slate-50 disabled:text-slate-400`}
          />
        </div>
        {appliedCode ? (
          <button
            onClick={() => {
              setAppliedCode("");
              setPromoCode("");
              clearCodeError();
            }}
            className="flex items-center gap-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        ) : (
          <button
            onClick={() => promoCode.trim() && setAppliedCode(promoCode.trim())}
            disabled={!promoCode.trim()}
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40"
          >
            Apply
          </button>
        )}
      </div>

      {codeError && <p className="mb-2 text-xs text-red-500">{codeError}</p>}

      {appliedCode && winner === "code" && (
        <p className="mb-2 text-xs text-green-600">
          <strong className="font-mono">{appliedCode}</strong> applied —{" "}
          {GHS(resolution!.discountAmount)} off
        </p>
      )}

      {/* Automatic bundle rules */}
      {autoCandidates.length > 0 && (
        <div className="mb-2 space-y-1">
          {autoCandidates.map((c) => (
            <div
              key={c.promoCodeId}
              className={`flex items-start gap-1.5 rounded-md px-2.5 py-1.5 text-xs ${
                winner === "pairing" && c.promoCodeId === resolution?.promoCodeId
                  ? "bg-indigo-50 text-indigo-700"
                  : "bg-slate-50 text-slate-500"
              }`}
            >
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                <strong>{c.label}</strong> — {GHS(c.amount)} off
                {c.pairing && (
                  <>
                    {" "}({c.pairing.pairedCount} paired{" "}
                    {c.pairing.basis === "products" ? "product" : "item"}
                    {c.pairing.pairedCount === 1 ? "" : "s"})
                  </>
                )}
                {winner !== "pairing" && " · not applied"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Manual staff override */}
      <div className="flex gap-2">
        <select
          value={manualType}
          onChange={(e) => setManualType(e.target.value as "none" | ValueType)}
          className={inputCls}
        >
          <option value="none">No manual discount</option>
          <option value="percentage">%</option>
          <option value="fixed">GH₵</option>
        </select>
        {manualType !== "none" && (
          <>
            <input
              value={manualValue}
              onChange={(e) => setManualValue(e.target.value)}
              type="number"
              min="0"
              placeholder="0"
              className={`${inputCls} w-24`}
            />
            <input
              value={manualReason}
              onChange={(e) => setManualReason(e.target.value)}
              placeholder="Reason"
              className={`${inputCls} flex-1`}
            />
          </>
        )}
      </div>

      {overriddenBy && (
        <p className="mt-2 flex items-start gap-1.5 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-amber-700">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            This manual discount overrides <strong>{overriddenBy.label}</strong>, worth{" "}
            {GHS(overriddenBy.amount)} — the customer gets{" "}
            {GHS(resolution!.discountAmount)} instead.
          </span>
        </p>
      )}
    </section>
  );
}
