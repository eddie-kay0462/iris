"use client";

import { useState, useEffect } from "react";
import { Save, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRevenueTarget, useUpdateRevenueTarget } from "@/lib/api/orders";
import {
  useShippingOptions,
  useUpdateShippingOptions,
  ShippingOption,
  useStockHoldMinutes,
  useUpdateStockHoldMinutes,
  usePreorderEtaText,
  useUpdatePreorderEtaText,
} from "@/lib/api/settings";
import { toast } from "sonner";

export default function GeneralSettingsPage() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [draftTarget, setDraftTarget] = useState<string>("");

  const { data: shippingOptions, isLoading: loadingShipping } = useShippingOptions();
  const { mutate: saveShipping, isPending: savingShipping } = useUpdateShippingOptions();
  const [draftShipping, setDraftShipping] = useState<ShippingOption[]>([]);

  useEffect(() => {
    if (shippingOptions) setDraftShipping(shippingOptions);
  }, [shippingOptions]);

  function handleShippingPriceChange(id: string, value: string) {
    setDraftShipping((prev) =>
      prev.map((o) => (o.id === id ? { ...o, price: parseFloat(value) || 0 } : o))
    );
  }

  function handleShippingLabelChange(id: string, value: string) {
    setDraftShipping((prev) =>
      prev.map((o) => (o.id === id ? { ...o, label: value } : o))
    );
  }

  function handleShippingEstimateChange(id: string, value: string) {
    setDraftShipping((prev) =>
      prev.map((o) => (o.id === id ? { ...o, estimate: value } : o))
    );
  }

  function handleSaveShipping() {
    saveShipping(draftShipping, {
      onSuccess: () => {
        toast.success("Shipping options updated.");
      },
    });
  }

  const { data: stockHoldMinutes, isLoading: loadingStockHold } = useStockHoldMinutes();
  const { mutate: saveStockHold, isPending: savingStockHold } = useUpdateStockHoldMinutes();
  const [draftStockHold, setDraftStockHold] = useState<string>("");

  useEffect(() => {
    if (stockHoldMinutes !== undefined && stockHoldMinutes !== null) {
      setDraftStockHold(String(stockHoldMinutes));
    }
  }, [stockHoldMinutes]);

  function handleSaveStockHold() {
    const minutes = parseFloat(draftStockHold);
    if (isNaN(minutes) || minutes <= 0) return;
    saveStockHold(minutes, {
      onSuccess: () => {
        toast.success("Stock hold duration updated.");
      },
    });
  }

  const { data: preorderEtaText, isLoading: loadingPreorderEta } = usePreorderEtaText();
  const { mutate: savePreorderEta, isPending: savingPreorderEta } = useUpdatePreorderEtaText();
  const [draftPreorderEta, setDraftPreorderEta] = useState<string>("");

  useEffect(() => {
    if (preorderEtaText !== undefined && preorderEtaText !== null) {
      setDraftPreorderEta(preorderEtaText);
    }
  }, [preorderEtaText]);

  function handleSavePreorderEta() {
    if (!draftPreorderEta.trim()) return;
    savePreorderEta(draftPreorderEta, {
      onSuccess: () => {
        toast.success("Pre-order ETA text updated.");
      },
    });
  }

  const { data: targetData, isLoading } = useRevenueTarget(selectedYear);
  const { mutate: updateTarget, isPending } = useUpdateRevenueTarget();

  useEffect(() => {
    if (targetData !== undefined && targetData !== null) {
      setDraftTarget(String(targetData));
    } else {
      setDraftTarget("");
    }
  }, [targetData]);

  const handleSave = () => {
    const numericTarget = parseFloat(draftTarget.replace(/,/g, ""));
    if (!isNaN(numericTarget) && numericTarget > 0) {
      updateTarget(
        { year: selectedYear, target: numericTarget },
        {
          onSuccess: () => {
            toast.success("Revenue target updated.");
          },
        }
      );
    }
  };

  return (
    <section className="space-y-6 max-w-4xl">
      <Link href="/settings" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Settings
      </Link>
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">General Settings</h1>
        <p className="text-sm text-slate-500">
          Manage system-wide settings, brand parameters, and yearly targets.
        </p>
      </header>

      {/* Shipping Options */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-slate-900">Shipping Options</h2>
            <p className="text-sm text-slate-500 mt-1">
              Set the label, delivery estimate, and price for each shipping tier. Changes apply immediately to the checkout.
            </p>
          </div>

          {loadingShipping ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : (
            <div className="space-y-4">
              {draftShipping.map((option) => (
                <div key={option.id} className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Label</label>
                    <input
                      type="text"
                      value={option.label}
                      onChange={(e) => handleShippingLabelChange(option.id, e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Estimate</label>
                    <input
                      type="text"
                      value={option.estimate}
                      onChange={(e) => handleShippingEstimateChange(option.id, e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Price (GH₵)</label>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-sm">₵</span>
                      <input
                        type="number"
                        min={0}
                        value={option.price}
                        onChange={(e) => handleShippingPriceChange(option.id, e.target.value)}
                        className="w-full rounded-lg border border-slate-300 pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 flex items-center gap-4">
            <button
              onClick={handleSaveShipping}
              disabled={savingShipping || loadingShipping}
              className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {savingShipping ? "Saving…" : "Save shipping options"}
            </button>
          </div>
        </div>
      </div>

      {/* Checkout Stock Hold */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-slate-900">Checkout Stock Hold</h2>
            <p className="text-sm text-slate-500 mt-1">
              How long stock is reserved for a customer once they start checkout, before the hold
              expires and the items become available to other shoppers again.
            </p>
          </div>

          {loadingStockHold ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : (
            <div className="max-w-xs space-y-1">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Hold duration (minutes)
              </label>
              <input
                type="number"
                min={1}
                value={draftStockHold}
                onChange={(e) => setDraftStockHold(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          )}

          <div className="mt-6 flex items-center gap-4">
            <button
              onClick={handleSaveStockHold}
              disabled={savingStockHold || loadingStockHold}
              className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {savingStockHold ? "Saving…" : "Save hold duration"}
            </button>
          </div>
        </div>
      </div>

      {/* Pre-order ETA */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-slate-900">Pre-order ETA</h2>
            <p className="text-sm text-slate-500 mt-1">
              Rough estimate shown to customers in pre-order confirmation emails and SMS for when
              they can expect to be contacted about receiving their item.
            </p>
          </div>

          {loadingPreorderEta ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : (
            <div className="max-w-xs space-y-1">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                ETA text
              </label>
              <input
                type="text"
                value={draftPreorderEta}
                onChange={(e) => setDraftPreorderEta(e.target.value)}
                placeholder="e.g. 2-3 weeks"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          )}

          <div className="mt-6 flex items-center gap-4">
            <button
              onClick={handleSavePreorderEta}
              disabled={savingPreorderEta || loadingPreorderEta}
              className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {savingPreorderEta ? "Saving…" : "Save ETA text"}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Brand Targets Section */}
        <div className="p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-slate-900">Yearly Revenue Goal</h2>
            <p className="text-sm text-slate-500 mt-1">
              Set the global revenue target for the dashboard. This target is visible to all admins and is used to compute progress in the main dashboard.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-lg">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Financial Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                {[...Array(5)].map((_, i) => (
                  <option key={i} value={currentYear - 2 + i}>
                    {currentYear - 2 + i}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Target Amount (GH₵)</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="text-slate-500 sm:text-sm">₵</span>
                </div>
                <input
                  type="number"
                  value={draftTarget}
                  onChange={(e) => setDraftTarget(e.target.value)}
                  placeholder="e.g. 500000"
                  className="w-full rounded-lg border border-slate-300 pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={handleSave}
                disabled={isPending || isLoading || !draftTarget}
                className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {isPending ? "Saving..." : "Save target"}
              </button>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>Takes effect immediately across all sessions.</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
