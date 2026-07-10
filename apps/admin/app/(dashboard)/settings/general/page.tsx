"use client";

import { useState, useEffect } from "react";
import { Save, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRevenueTarget, useUpdateRevenueTarget } from "@/lib/api/orders";
import {
  useShippingOptions,
  useUpdateShippingOptions,
  ShippingOption,
  useCountryShippingRates,
  useUpdateCountryShippingRates,
  CountryShippingRate,
  useStockHoldMinutes,
  useUpdateStockHoldMinutes,
  usePreorderEtaText,
  useUpdatePreorderEtaText,
  useRoadToHqBaseline,
  useUpdateRoadToHqBaseline,
  useRoadToHqTarget,
  useUpdateRoadToHqTarget,
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

  const { data: countryRates, isLoading: loadingCountryRates } = useCountryShippingRates();
  const { mutate: saveCountryRates, isPending: savingCountryRates } = useUpdateCountryShippingRates();
  const [draftCountryRates, setDraftCountryRates] = useState<CountryShippingRate[]>([]);

  useEffect(() => {
    if (countryRates) setDraftCountryRates(countryRates);
  }, [countryRates]);

  function handleCountryRateChange(
    country: string,
    field: keyof CountryShippingRate,
    value: string
  ) {
    setDraftCountryRates((prev) =>
      prev.map((r) =>
        r.country === country
          ? { ...r, [field]: field === "price" ? parseFloat(value) || 0 : value }
          : r
      )
    );
  }

  function handleSaveCountryRates() {
    saveCountryRates(draftCountryRates, {
      onSuccess: () => {
        toast.success("International shipping rates updated.");
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

  const { data: roadBaseline, isLoading: loadingRoadBaseline } = useRoadToHqBaseline();
  const { mutate: saveRoadBaseline, isPending: savingRoadBaseline } = useUpdateRoadToHqBaseline();
  const [draftRoadBaseline, setDraftRoadBaseline] = useState<string>("");

  useEffect(() => {
    if (roadBaseline !== undefined && roadBaseline !== null) {
      setDraftRoadBaseline(String(roadBaseline));
    }
  }, [roadBaseline]);

  const { data: roadTarget, isLoading: loadingRoadTarget } = useRoadToHqTarget();
  const { mutate: saveRoadTarget, isPending: savingRoadTarget } = useUpdateRoadToHqTarget();
  const [draftRoadTarget, setDraftRoadTarget] = useState<string>("");

  useEffect(() => {
    if (roadTarget !== undefined && roadTarget !== null) {
      setDraftRoadTarget(String(roadTarget));
    }
  }, [roadTarget]);

  function handleSaveRoadBaseline() {
    const value = parseInt(draftRoadBaseline.replace(/,/g, ""), 10);
    if (isNaN(value) || value < 0) {
      toast.error("Baseline must be a whole number of 0 or more.");
      return;
    }
    saveRoadBaseline(value, {
      onSuccess: () => toast.success("Road to HQ baseline updated."),
    });
  }

  function handleSaveRoadTarget() {
    const value = parseInt(draftRoadTarget.replace(/,/g, ""), 10);
    if (isNaN(value) || value < 1) {
      toast.error("Target must be a whole number of 1 or more.");
      return;
    }
    saveRoadTarget(value, {
      onSuccess: () => toast.success("Road to HQ target updated."),
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

      {/* International Shipping Rates */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-slate-900">International Shipping Rates</h2>
            <p className="text-sm text-slate-500 mt-1">
              Flat shipping fee (in GH₵) charged for each country we ship to outside Ghana. Applied at checkout and enforced on the order.
            </p>
          </div>

          {loadingCountryRates ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : draftCountryRates.length === 0 ? (
            <p className="text-sm text-slate-400">No international destinations configured.</p>
          ) : (
            <div className="space-y-4">
              {draftCountryRates.map((rate) => (
                <div key={rate.country} className="grid grid-cols-1 sm:grid-cols-4 gap-4 pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Country</label>
                    <input
                      type="text"
                      value={rate.label}
                      onChange={(e) => handleCountryRateChange(rate.country, "label", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Estimate</label>
                    <input
                      type="text"
                      value={rate.estimate}
                      onChange={(e) => handleCountryRateChange(rate.country, "estimate", e.target.value)}
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
                        value={rate.price}
                        onChange={(e) => handleCountryRateChange(rate.country, "price", e.target.value)}
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
              onClick={handleSaveCountryRates}
              disabled={savingCountryRates || loadingCountryRates}
              className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {savingCountryRates ? "Saving…" : "Save international rates"}
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

      {/* Road to HQ */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-slate-900">Road to HQ</h2>
            <p className="text-sm text-slate-500 mt-1">
              The homepage counter shows units sold toward the HQ goal. The <strong>baseline</strong>{" "}
              folds in historical units not tracked in this system (e.g. old Shopify / pop-up sales);
              live online, pop-up and ally sales are added on top of it automatically. The{" "}
              <strong>target</strong> is the goal shown on the progress ring.
            </p>
          </div>

          {loadingRoadBaseline || loadingRoadTarget ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-lg">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Baseline (units)
                </label>
                <input
                  type="number"
                  min={0}
                  value={draftRoadBaseline}
                  onChange={(e) => setDraftRoadBaseline(e.target.value)}
                  placeholder="e.g. 450"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Target (units)
                </label>
                <input
                  type="number"
                  min={1}
                  value={draftRoadTarget}
                  onChange={(e) => setDraftRoadTarget(e.target.value)}
                  placeholder="e.g. 6000"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleSaveRoadBaseline}
                disabled={savingRoadBaseline || loadingRoadBaseline}
                className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {savingRoadBaseline ? "Saving…" : "Save baseline"}
              </button>
              <button
                onClick={handleSaveRoadTarget}
                disabled={savingRoadTarget || loadingRoadTarget}
                className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {savingRoadTarget ? "Saving…" : "Save target"}
              </button>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>The homepage counter is cached and can take up to ~5 minutes to update.</span>
            </div>
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
